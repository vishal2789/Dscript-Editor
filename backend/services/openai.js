import OpenAI from 'openai';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ffmpeg from 'fluent-ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get OpenAI client instance (checks API key at runtime)
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in process.env');
    console.error('   Make sure .env file exists in backend/ and contains OPENAI_API_KEY=your_key');
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Transcribe audio/video file using OpenAI Whisper
 * Returns transcription with timestamps and speaker diarization (if available)
 */
export async function transcribeAudio(filePath) {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  let tempAudioPath = null; // Declare outside try block for cleanup

  try {
    // Read file as buffer - OpenAI SDK accepts File objects created from buffers
    const { basename } = await import('path');
    const fileName = basename(filePath);
    
    // Get original file size for logging (do not block yet, we'll try compressing)
    const stats = await fs.stat(filePath);
    const originalFileSizeMB = stats.size / 1024 / 1024;
    
    console.log(`Transcribing file: ${fileName} (${originalFileSizeMB.toFixed(2)} MB)`);

    // Check if file is a video - extract audio first for better compatibility
    const ext = fileName.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
    const isVideo = videoExtensions.includes(ext);
    
    let fileToTranscribe = filePath;
    
    // If it's a video file, extract audio first (OpenAI works better with audio files)
    if (isVideo) {
      console.log('Video file detected, extracting audio...');
      tempAudioPath = join(__dirname, '../uploads', `temp-audio-${Date.now()}.mp3`);
      
      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .outputOptions(['-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1'])
          .output(tempAudioPath)
          .on('end', () => {
            console.log('Audio extraction complete');
            resolve();
          })
          .on('error', (err) => {
            console.warn('Audio extraction failed, using original file:', err.message);
            tempAudioPath = null; // Use original file if extraction fails
            resolve();
          })
          .run();
      });
      
      if (tempAudioPath && fs.existsSync(tempAudioPath)) {
        fileToTranscribe = tempAudioPath;
        console.log('Using extracted audio file for transcription');
      }
    }
    
    // After choosing file to transcribe, enforce OpenAI size limit (25MB)
    const transcribeStats = await fs.stat(fileToTranscribe);
    const transcribeFileSizeMB = transcribeStats.size / 1024 / 1024;
    if (transcribeFileSizeMB > 25) {
      throw new Error(`File too large: ${transcribeFileSizeMB.toFixed(2)} MB after audio extraction/compression. Please use a shorter clip or compress further (max 25 MB).`);
    }
    
    // Read file as buffer
    const fileBuffer = await fs.readFile(fileToTranscribe);
    
    // Use correct filename - if we extracted audio, use audio filename
    const fileToUseName = tempAudioPath ? basename(tempAudioPath) : fileName;
    
    // Determine MIME type - always use audio/mpeg for extracted audio
    const mimeType = isVideo && tempAudioPath ? 'audio/mpeg' : 'audio/mpeg';
    
    console.log(`Preparing file for upload: ${fileToUseName} (${(fileBuffer.length / 1024).toFixed(2)} KB, type: ${mimeType})`);
    
    // Create File object from buffer
    // In Node.js 18+, File is available globally
    let file;
    try {
      // Try creating File object (Node.js 18+)
      if (typeof File !== 'undefined') {
        file = new File(
          [fileBuffer],
          fileToUseName, // Use the correct filename
          { type: mimeType }
        );
      } else {
        // Fallback: create a File-like object
        const { Blob } = await import('buffer');
        const blob = new Blob([fileBuffer], { type: mimeType });
        file = Object.assign(blob, {
          name: fileToUseName,
          lastModified: Date.now()
        });
      }
    } catch (err) {
      console.error('Error creating File object:', err);
      // Last resort: try using the buffer directly with a Blob
      const { Blob } = await import('buffer');
      const blob = new Blob([fileBuffer], { type: mimeType });
      file = Object.assign(blob, {
        name: fileToUseName,
        lastModified: Date.now()
      });
    }

    // Use OpenAI transcription API with timeout and retry handling
    console.log('Sending to OpenAI API...');
    console.log(`File type: ${file.constructor.name}, size: ${file.size} bytes, name: ${file.name}, mime: ${mimeType}`);
    
    // Retry logic with exponential backoff for connection errors
    let lastError = null;
    const maxRetries = 3;
    let transcription = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        transcription = await openai.audio.transcriptions.create(
          {
            file: file,
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment', 'word']
          },
          {
            timeout: 300000, // 5 minute timeout
            maxRetries: 0 // We handle retries manually
          }
        );
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        const isConnectionError = error.code === 'ECONNRESET' || 
                                  error.message?.includes('Connection') ||
                                  error.cause?.code === 'ECONNRESET';
        
        if (isConnectionError && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.warn(`Connection error on attempt ${attempt}/${maxRetries}. Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error; // Re-throw if not a connection error or out of retries
      }
    }
    
    if (!transcription) {
      throw lastError || new Error('Failed to transcribe after retries');
    }
    
    console.log('Transcription successful:', transcription.text?.substring(0, 100) + '...');

    // Format response
    const segments = transcription.segments || [];
    const words = transcription.words || [];

    // Map words to segments for better timestamp accuracy
    const segmentMap = segments.map(seg => {
      const segmentWords = words.filter(w => 
        w.start >= seg.start && w.end <= seg.end
      );
      return {
        start: seg.start,
        end: seg.end,
        text: seg.text,
        words: segmentWords
      };
    });

    const result = {
      text: transcription.text,
      duration: transcription.duration,
      segments: segmentMap,
      language: transcription.language
    };
    
    // Clean up temporary audio file if created
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      try {
        await fs.remove(tempAudioPath);
        console.log('Cleaned up temporary audio file');
      } catch (err) {
        console.warn('Failed to clean up temp file:', err);
      }
    }
    
    return result;
  } catch (error) {
    // Clean up temporary audio file on error
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      try {
        await fs.remove(tempAudioPath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    console.error('Transcription error:', error);
    
    // Provide more helpful error messages
    if (error.code === 'ECONNRESET' || error.message?.includes('Connection')) {
      throw new Error(`Connection error: Unable to connect to OpenAI API. This might be a network issue or the file might be too large. Please try again or use a smaller file.`);
    } else if (error.status === 413 || error.message?.includes('too large')) {
      throw new Error(`File too large: Please use a file smaller than 25 MB.`);
    } else if (error.status === 401) {
      throw new Error(`Authentication error: Invalid OpenAI API key. Please check your .env file.`);
    } else if (error.status === 429) {
      // Distinguish between rate limits and quota issues
      if (error.code === 'insufficient_quota' || error.error?.type === 'insufficient_quota') {
        throw new Error(`Quota exceeded: You have exceeded your OpenAI API quota. Please check your billing and plan details at https://platform.openai.com/account/billing. You may need to add payment information or upgrade your plan.`);
      } else {
        throw new Error(`Rate limit exceeded: Too many requests. Please wait a moment and try again.`);
      }
    }
    
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Improve captions using GPT
 */
export async function improveCaptions(captionText, style = 'grammar') {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  const stylePrompts = {
    grammar: 'Fix grammar, spelling, and punctuation errors while keeping the original meaning and style.',
    concise: 'Make the text more concise and clear while preserving all important information.',
    professional: 'Rewrite in a professional, formal tone suitable for business presentations.',
    casual: 'Rewrite in a casual, conversational tone while maintaining clarity.'
  };

  const prompt = `Improve the following captions/subtitles. ${stylePrompts[style] || stylePrompts.grammar}

Text to improve:
${captionText}

Return only the improved text, without any explanations or additional commentary.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional caption editor. Improve the provided text according to the instructions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Caption improvement error:', error);
    throw new Error(`Failed to improve captions: ${error.message}`);
  }
}

