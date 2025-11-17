import axios from 'axios';
import OpenAI from 'openai';
import fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';

/**
 * Analyze scene image using OpenAI Vision to extract keywords
 */
export async function analyzeSceneImage(imagePath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey });

  try {
    // Read image and convert to base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log('Analyzing scene with OpenAI Vision...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing images and generating precise search keywords for stock video databases. 
Your goal is to identify the MAIN SUBJECT and relevant context that would help find similar stock footage.
Be specific and concrete. Focus on objects, people, actions, and settings that are clearly visible.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Look at this video frame carefully and identify:
1. The PRIMARY subject/object (be VERY specific - e.g., "nike running shoe", "leather boot", "high heel")
2. The action or context (e.g., "close-up", "product shot", "on feet", "walking")
3. The setting/background (e.g., "white background", "studio", "outdoor", "street")
4. Any distinctive features (e.g., "red laces", "black leather", "athletic")

Return 3-5 highly specific search keywords that would find SIMILAR stock videos.
Format: comma-separated keywords, most important first.
Be concrete and specific, not generic.

Examples:
- If you see a shoe: "nike running shoe, athletic footwear, product photography, white background"
- If you see food: "pizza slice, close up, food photography, restaurant table"
- If you see a person: "businessman, corporate office, laptop, typing, modern workspace"

Return ONLY the keywords, no explanation:`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    });

    let keywords = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    keywords = keywords.replace(/```plaintext\n?/g, '');
    keywords = keywords.replace(/```\n?/g, '');
    keywords = keywords.replace(/^["']|["']$/g, ''); // Remove quotes
    keywords = keywords.trim();
    
    console.log('Extracted keywords:', keywords);

    return keywords;
  } catch (error) {
    console.error('Scene analysis error:', error);
    throw new Error(`Failed to analyze scene: ${error.message}`);
  }
}

/**
 * Search stock videos using Pexels API
 * @param {string} query - Search keywords
 * @param {number} perPage - Number of results to return
 * @param {number} targetDuration - Target duration in seconds (optional, for filtering)
 */
export async function searchStockVideos(query, perPage = 15, targetDuration = null) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error('Pexels API key not configured. Get one free at https://www.pexels.com/api/');
  }

  try {
    console.log(`Searching Pexels for: "${query}"${targetDuration ? ` (target duration: ${targetDuration}s)` : ''}`);

    // Request more videos initially if we need to filter by duration
    const requestCount = targetDuration ? perPage * 3 : perPage;

    const response = await axios.get('https://api.pexels.com/videos/search', {
      params: {
        query: query,
        per_page: Math.min(requestCount, 80), // Pexels max is 80
        orientation: 'landscape'
      },
      headers: {
        Authorization: apiKey
      }
    });

    let videos = response.data.videos.map(video => ({
      id: video.id,
      url: video.url,
      image: video.image,
      duration: video.duration,
      width: video.width,
      height: video.height,
      user: {
        name: video.user.name,
        url: video.user.url
      },
      // Get the best quality video file (prefer HD)
      videoFiles: video.video_files
        .filter(file => file.quality === 'hd' || file.quality === 'sd')
        .sort((a, b) => b.width - a.width)
        .slice(0, 3)
        .map(file => ({
          quality: file.quality,
          width: file.width,
          height: file.height,
          link: file.link,
          fileType: file.file_type
        }))
    }));

    // Filter by duration if specified (within ±50% of target duration)
    if (targetDuration) {
      const minDuration = targetDuration * 0.5; // 50% shorter is ok
      const maxDuration = targetDuration * 1.5; // 50% longer is ok
      
      videos = videos
        .filter(video => video.duration >= minDuration && video.duration <= maxDuration)
        .sort((a, b) => {
          // Sort by closeness to target duration
          const aDiff = Math.abs(a.duration - targetDuration);
          const bDiff = Math.abs(b.duration - targetDuration);
          return aDiff - bDiff;
        })
        .slice(0, perPage);
      
      console.log(`Filtered to ${videos.length} videos matching duration ${targetDuration}s (±50%)`);
    }

    console.log(`Found ${videos.length} stock videos`);
    return videos;
  } catch (error) {
    console.error('Stock video search error:', error);
    if (error.response?.status === 401) {
      throw new Error('Invalid Pexels API key. Please check your .env file.');
    }
    throw new Error(`Failed to search stock videos: ${error.message}`);
  }
}

/**
 * Download stock video from URL
 */
export async function downloadStockVideo(videoUrl, outputPath) {
  try {
    console.log('Downloading stock video...');
    
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Stock video downloaded successfully');
        resolve(outputPath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Failed to download stock video: ${error.message}`);
  }
}

/**
 * Replace scene in video with stock footage
 */
export async function replaceSceneWithStock(
  originalVideoPath,
  stockVideoPath,
  sceneStart,
  sceneEnd,
  outputPath
) {
  try {
    console.log(`Replacing scene ${sceneStart}s - ${sceneEnd}s with stock footage (keeping original audio)`);

    const sceneDuration = sceneEnd - sceneStart;
    const tempDir = join(outputPath, '../temp');
    await fs.ensureDir(tempDir);

    // Step 1: Extract parts of original video
    const beforeScenePath = join(tempDir, `before-${Date.now()}.mp4`);
    const afterScenePath = join(tempDir, `after-${Date.now()}.mp4`);
    const trimmedStockPath = join(tempDir, `stock-trimmed-${Date.now()}.mp4`);
    const originalAudioPath = join(tempDir, `original-audio-${Date.now()}.aac`);

    // Extract video before scene (video only, no audio)
    if (sceneStart > 0) {
      await new Promise((resolve, reject) => {
        ffmpeg(originalVideoPath)
          .setStartTime(0)
          .setDuration(sceneStart)
          .noAudio()
          .videoCodec('libx264')
          .outputOptions(['-preset', 'fast', '-crf', '23'])
          .output(beforeScenePath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      console.log('Extracted video before scene');
    }

    // Extract video after scene (video only, no audio)
    await new Promise((resolve, reject) => {
      ffmpeg(originalVideoPath)
        .setStartTime(sceneEnd)
        .noAudio()
        .videoCodec('libx264')
        .outputOptions(['-preset', 'fast', '-crf', '23'])
        .output(afterScenePath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    console.log('Extracted video after scene');

    // Step 2: Trim and scale stock video to match scene duration and dimensions
    // Get original video dimensions
    const videoInfo = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(originalVideoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    // Find the video stream (not audio)
    const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
    if (!videoStream || !videoStream.width || !videoStream.height) {
      throw new Error('Could not determine video dimensions from original video');
    }
    
    const originalWidth = videoStream.width;
    const originalHeight = videoStream.height;
    
    console.log(`Original video dimensions: ${originalWidth}x${originalHeight}`);

    // Extract original audio track (full duration)
    await new Promise((resolve, reject) => {
      ffmpeg(originalVideoPath)
        .outputOptions(['-vn', '-acodec', 'copy'])
        .output(originalAudioPath)
        .on('end', () => {
          console.log('Extracted original audio');
          resolve();
        })
        .on('error', reject)
        .run();
    });

    // Trim and scale stock video (VIDEO ONLY, no audio) - ensure exact duration
    await new Promise((resolve, reject) => {
      ffmpeg(stockVideoPath)
        .setStartTime(0)
        .setDuration(sceneDuration)
        .size(`${originalWidth}x${originalHeight}`)
        .videoCodec('libx264')
        .outputOptions([
          '-preset', 'fast',
          '-crf', '23',
          '-t', String(sceneDuration), // Force exact duration
          '-an' // No audio
        ])
        .output(trimmedStockPath)
        .on('end', () => {
          console.log(`Trimmed and scaled stock video to exact duration: ${sceneDuration}s`);
          resolve();
        })
        .on('error', reject)
        .run();
    });
    console.log('Trimmed and scaled stock video (video only)');

    // Step 3: Concatenate video parts (no audio yet)
    const concatListPath = join(tempDir, `concat-${Date.now()}.txt`);
    const videoOnlyPath = join(tempDir, `video-only-${Date.now()}.mp4`);
    let concatContent = '';
    
    if (sceneStart > 0) {
      concatContent += `file '${beforeScenePath}'\n`;
    }
    concatContent += `file '${trimmedStockPath}'\n`;
    concatContent += `file '${afterScenePath}'\n`;
    
    await fs.writeFile(concatListPath, concatContent);

    // Concatenate video parts with re-encoding to ensure precise timing
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c:v', 'libx264',    // Re-encode video for precise timing
          '-preset', 'medium',  // Balance speed and quality
          '-crf', '23',         // Good quality
          '-pix_fmt', 'yuv420p', // Ensure compatibility
          '-g', '30',           // Keyframe interval (1 per second at 30fps)
          '-keyint_min', '30',  // Minimum keyframe interval
          '-sc_threshold', '0', // Disable scene change detection
          '-force_key_frames', 'expr:gte(t,n_forced*1)' // Force keyframe every 1 second
        ])
        .output(videoOnlyPath)
        .on('end', () => {
          console.log('Video concatenation complete (re-encoded with keyframes for smooth playback)');
          resolve();
        })
        .on('error', (err) => {
          console.error('Concatenation error:', err);
          reject(err);
        })
        .run();
    });

    // Step 4: Combine concatenated video with original audio
    // ✅ FIX: Re-encode video to ensure proper sync and avoid freezing
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoOnlyPath)
        .input(originalAudioPath)
        .outputOptions([
          // Video encoding - Re-encode to ensure perfect sync
          '-c:v', 'libx264',       // Re-encode video (don't copy)
          '-preset', 'fast',       // Faster encoding
          '-crf', '23',            // Good quality
          '-pix_fmt', 'yuv420p',   // Compatibility
          
          // Audio encoding
          '-c:a', 'aac',           // Re-encode audio
          '-b:a', '192k',          // Good audio quality
          
          // Stream mapping
          '-map', '0:v:0',         // Use video from first input
          '-map', '1:a:0',         // Use audio from second input
          
          // Sync options - CRITICAL for preventing freezing
          '-vsync', 'cfr',         // Constant frame rate (prevents stuttering)
          '-async', '1',           // Audio sync (prevents audio drift)
          '-max_muxing_queue_size', '1024', // Handle large buffers
          
          // Duration handling
          '-shortest'              // Match shortest stream duration
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('Final video with original audio complete (with sync fixes)');
          resolve();
        })
        .on('error', (err) => {
          console.error('Audio merge error:', err);
          reject(err);
        })
        .run();
    });

    // Cleanup temp files
    try {
      await fs.remove(tempDir);
      console.log('Cleaned up temporary files');
    } catch (err) {
      console.warn('Failed to clean up temp files:', err);
    }

    return outputPath;
  } catch (error) {
    console.error('Scene replacement error:', error);
    throw new Error(`Failed to replace scene: ${error.message}`);
  }
}

