import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import { extractSceneFrames, generateThumbnails } from '../services/ffmpeg.js';

const execAsync = promisify(exec);
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
const tempDir = join(uploadDir, 'temp');

fs.ensureDirSync(tempDir);

/**
 * Replace scene in video with processed scene (similar to replaceSceneWithStock)
 * Uses simpler approach: extract parts, concatenate, then merge with audio
 */
async function replaceSceneWithProcessed(
  originalVideoPath,
  processedScenePath,
  sceneStart,
  sceneEnd,
  outputPath
) {
  try {
    console.log(`[ReplaceScene] Replacing scene ${sceneStart}s - ${sceneEnd}s with processed scene`);

    const sceneDuration = sceneEnd - sceneStart;
    const tempDir = join(outputPath, '../temp');
    await fs.ensureDir(tempDir);

    // Step 1: Extract parts of original video
    const beforeScenePath = join(tempDir, `before-${Date.now()}.mp4`);
    const afterScenePath = join(tempDir, `after-${Date.now()}.mp4`);
    const originalAudioPath = join(tempDir, `original-audio-${Date.now()}.aac`);

    // Extract video before scene (video only, no audio)
    if (sceneStart > 0) {
      await new Promise((resolve, reject) => {
        ffmpeg(originalVideoPath)
          .setStartTime(0)
          .setDuration(sceneStart)
          .noAudio()
          .videoCodec('libx264')
          .outputOptions(['-preset', 'ultrafast', '-crf', '23'])
          .output(beforeScenePath)
          .on('end', () => {
            console.log('[ReplaceScene] Extracted video before scene');
            resolve();
          })
          .on('error', reject)
          .run();
      });
    }

    // Extract video after scene (video only, no audio)
    await new Promise((resolve, reject) => {
      ffmpeg(originalVideoPath)
        .setStartTime(sceneEnd)
        .noAudio()
        .videoCodec('libx264')
        .outputOptions(['-preset', 'ultrafast', '-crf', '23'])
        .output(afterScenePath)
        .on('end', () => {
          console.log('[ReplaceScene] Extracted video after scene');
          resolve();
        })
        .on('error', reject)
        .run();
    });

    // Extract original audio track (full duration)
    await new Promise((resolve, reject) => {
      ffmpeg(originalVideoPath)
        .outputOptions(['-vn', '-acodec', 'copy'])
        .output(originalAudioPath)
        .on('end', () => {
          console.log('[ReplaceScene] Extracted original audio');
          resolve();
        })
        .on('error', reject)
        .run();
    });

    // Step 2: Concatenate video parts (no audio yet)
    const concatListPath = join(tempDir, `concat-${Date.now()}.txt`);
    const videoOnlyPath = join(tempDir, `video-only-${Date.now()}.mp4`);
    let concatContent = '';
    
    if (sceneStart > 0) {
      concatContent += `file '${beforeScenePath}'\n`;
    }
    concatContent += `file '${processedScenePath}'\n`;
    concatContent += `file '${afterScenePath}'\n`;
    
    await fs.writeFile(concatListPath, concatContent);

    // Concatenate video parts
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '23',
          '-pix_fmt', 'yuv420p'
        ])
        .output(videoOnlyPath)
        .on('end', () => {
          console.log('[ReplaceScene] Video concatenation complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('[ReplaceScene] Concatenation error:', err);
          reject(err);
        })
        .run();
    });

    // Step 3: Combine concatenated video with original audio
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoOnlyPath)
        .input(originalAudioPath)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-map', '0:v:0',
          '-map', '1:a:0',
          '-vsync', 'cfr',
          '-async', '1',
          '-shortest'
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('[ReplaceScene] Final video with original audio complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('[ReplaceScene] Audio merge error:', err);
          reject(err);
        })
        .run();
    });

    // Cleanup temp files
    try {
      await fs.remove(tempDir);
      console.log('[ReplaceScene] Cleaned up temporary files');
    } catch (err) {
      console.warn('[ReplaceScene] Failed to clean up temp files:', err);
    }

    return outputPath;
  } catch (error) {
    console.error('[ReplaceScene] Scene replacement error:', error);
    throw new Error(`Failed to replace scene: ${error.message}`);
  }
}

/**
 * POST /api/background/replace
 * Replace background of a scene using MediaPipe
 */
router.post('/replace', async (req, res) => {
  try {
    const { projectId, sceneId, backgroundType, backgroundValue } = req.body;

    if (!projectId || !sceneId || !backgroundType || !backgroundValue) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, sceneId, backgroundType, backgroundValue' 
      });
    }

    console.log(`Replacing background for scene ${sceneId} in project ${projectId}`);

    // Load project data
    const projectPath = join(uploadDir, `${projectId}.json`);
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = await fs.readJSON(projectPath);
    const scene = projectData.scenes.find(s => s.id === sceneId);
    
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const originalVideoPath = join(uploadDir, projectData.filePath);
    if (!fs.existsSync(originalVideoPath)) {
      return res.status(404).json({ error: 'Original video not found' });
    }

    // Create temp directory for this processing job
    const jobId = uuidv4();
    const jobDir = join(tempDir, `bg-remove-${jobId}`);
    await fs.ensureDir(jobDir);
    const framesDir = join(jobDir, 'frames');

    // Process scene with MediaPipe
    const processedScenePath = join(jobDir, 'processed-scene.mp4');
    
    console.log('Processing scene with MediaPipe...');
    
    // Prepare background value
    let bgValue = backgroundValue;
    if (backgroundType === 'image') {
      // Handle image paths
      if (backgroundValue.startsWith('/assets/')) {
        // Frontend asset - convert to full URL for Python script to download
        // Assuming frontend runs on localhost:3000 (adjust if different)
        bgValue = `http://localhost:3000${backgroundValue}`;
      } else if (!backgroundValue.startsWith('http') && !backgroundValue.startsWith('/')) {
        // Assume it's a local file path
        bgValue = backgroundValue;
      }
      // If it's already a full URL, use it as-is
    }

    // Call Python script with optimization parameters
    const pythonScript = join(__dirname, '../services/mediapipe_bg_removal.py');
    const sceneDuration = scene.end - scene.start;
    let processingFps = 12;
    if (sceneDuration <= 1.5) {
      processingFps = 8;
    } else if (sceneDuration <= 4) {
      processingFps = 10;
    }

    const inputData = JSON.stringify({
      input_video: originalVideoPath,
      scene_start: scene.start,
      scene_end: scene.end,
      output_video: processedScenePath,
      background_type: backgroundType,
      background_value: bgValue,
      frames_dir: framesDir,
      // Optimization parameters
      similarity_threshold: 0.05,  // 5% difference threshold (adjustable: 0.01-0.1)
      processing_fps: processingFps,
      use_fast_model: true  // use faster model (u2netp) for quicker processing
    });

    try {
      // Use virtual environment Python if available, fallback to system python3
      const pythonCmd = fs.existsSync('/opt/venv/bin/python3') 
        ? '/opt/venv/bin/python3' 
        : 'python3';
      
      console.log(`Starting MediaPipe processing for scene ${sceneId}...`);
      console.log(`Python command: ${pythonCmd}`);
      console.log(`Scene duration: ${scene.end - scene.start} seconds`);
      
      // Add timeout based on scene duration (shorter videos = shorter timeout)
      const sceneDuration = scene.end - scene.start;
      // Base timeout: 2 minutes + 30 seconds per second of video
      // For 1-second video: 2.5 minutes, for 30-second video: 17 minutes
      const timeout = Math.min(
        (2 * 60 + sceneDuration * 30) * 1000, // Dynamic timeout
        10 * 60 * 1000 // Max 10 minutes
      );
      const startTime = Date.now();
      
      console.log(`Setting timeout to ${(timeout / 1000 / 60).toFixed(1)} minutes for ${sceneDuration.toFixed(1)}s scene`);
      
      // Use spawn for better control over stdin/stdout/stderr
      const { spawn } = await import('child_process');
      
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        const pythonProc = spawn(pythonCmd, [pythonScript], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        let processFinished = false;
        
        // Send input data
        pythonProc.stdin.write(inputData);
        pythonProc.stdin.end();
        
        // Capture stdout (JSON result)
        pythonProc.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        // Capture stderr (debug output) and log in real-time
        pythonProc.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          // Log in real-time
          output.split('\n').forEach(line => {
            if (line.trim()) {
              console.log(`  [Python] ${line}`);
            }
          });
        });
        
        // Handle completion
        pythonProc.on('close', (code) => {
          if (processFinished) return;
          processFinished = true;
          
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`Python script completed in ${elapsed} seconds (exit code: ${code})`);
          
          if (code === 0) {
            try {
              console.log(`[DEBUG] Python stdout length: ${stdout.length}, content preview: ${stdout.substring(0, 200)}`);
              const result = JSON.parse(stdout);
              console.log(`[DEBUG] Parsed JSON successfully, result.success: ${result.success}`);
              if (!result.success) {
                console.error(`[DEBUG] Python script returned success=false: ${result.error}`);
                reject(new Error(result.error || 'MediaPipe processing failed'));
              } else {
                console.log(`✅ Processed ${result.processed_frames} frames with MediaPipe`);
                console.log(`[DEBUG] About to resolve Promise...`);
                resolve({ stdout, stderr });
                console.log(`[DEBUG] Promise resolved`);
              }
            } catch (parseError) {
              console.error('Failed to parse Python output:', stdout);
              console.error('Parse error:', parseError);
              reject(new Error(`Python script returned invalid JSON. Output: ${stdout.substring(0, 200)}`));
            }
          } else {
            reject(new Error(`Python script exited with code ${code}. Stderr: ${stderr.substring(0, 500)}`));
          }
        });
        
        // Handle errors
        pythonProc.on('error', (error) => {
          if (processFinished) return;
          processFinished = true;
          reject(new Error(`Failed to start Python script: ${error.message}`));
        });
        
        // Timeout handling
        const timeoutId = setTimeout(() => {
          if (processFinished) return;
          processFinished = true;
          pythonProc.kill('SIGTERM');
          console.error(`Python script timeout after ${(timeout / 1000).toFixed(0)} seconds`);
          console.error(`Last stdout: ${stdout.substring(Math.max(0, stdout.length - 200))}`);
          console.error(`Last stderr: ${stderr.substring(Math.max(0, stderr.length - 500))}`);
          reject(new Error(`Python script execution timeout (${(timeout / 1000 / 60).toFixed(1)} minutes). Last output: ${stderr.split('\n').slice(-3).join('; ') || 'No output captured'}`));
        }, timeout);
        
        pythonProc.on('close', () => {
          clearTimeout(timeoutId);
        });
      });
      
      console.log(`[DEBUG] After await, stdout length: ${stdout?.length || 0}, stderr length: ${stderr?.length || 0}`);
      console.log(`✅ Python script Promise resolved. Moving to video merge step...`);
    } catch (error) {
      console.error(`[DEBUG] Error in Python script execution block:`, error);
      console.error('MediaPipe processing error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        signal: error.signal,
        stderr: error.stderr
      });
      
      // Cleanup
      await fs.remove(jobDir).catch(() => {});
      
      // Provide more detailed error message
      let errorMessage = 'Background removal failed: ';
      if (error.message.includes('timeout')) {
        errorMessage += 'Processing took too long (timeout after 5 minutes). The video might be too long or MediaPipe might be having issues.';
      } else if (error.code === 'ENOENT') {
        errorMessage += `Python not found. Make sure Python 3 and MediaPipe are installed.`;
      } else if (error.stderr) {
        errorMessage += error.stderr.substring(0, 200);
      } else {
        errorMessage += error.message;
      }
      
      return res.status(500).json({ 
        error: errorMessage 
      });
    }

    // Replace scene in main video using the same approach as stock media replacement
    console.log('✅ Python processing complete. Starting video merge...');
    const outputVideoId = uuidv4();
    const outputVideoPath = join(uploadDir, `edited-${outputVideoId}.mp4`);

    console.log(`Replacing scene in main video: ${scene.start}s - ${scene.end}s`);
    console.log(`Original video: ${originalVideoPath} (exists: ${fs.existsSync(originalVideoPath)})`);
    console.log(`Processed scene: ${processedScenePath} (exists: ${fs.existsSync(processedScenePath)})`);
    console.log(`Output video: ${outputVideoPath}`);
    
    // Use the simpler replaceSceneWithProcessed function (same approach as stock media)
    await replaceSceneWithProcessed(
      originalVideoPath,
      processedScenePath,
      scene.start,
      scene.end,
      outputVideoPath
    );
    
    // Get new video duration
    const newVideoDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(outputVideoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
    });

    // Re-extract frames for all scenes
    console.log('Re-extracting frames for all scenes...');
    const allFrames = [];
    for (const s of projectData.scenes) {
      const sceneFrames = await extractSceneFrames(
        outputVideoPath,
        projectId,
        s.id,
        s.start,
        s.end
      );
      
      const cacheBust = Date.now();
      const framesWithMetadata = sceneFrames.map((frame, frameIdx) => ({
        ...frame,
        id: frame.id || `frame-${projectId}-${s.id}-${frameIdx}`,
        sceneId: s.id,
        cacheBust: cacheBust
      }));
      
      allFrames.push(...framesWithMetadata);
    }

    allFrames.sort((a, b) => a.time - b.time);

    // Regenerate thumbnails
    const newThumbnails = await generateThumbnails(outputVideoPath, projectId, projectData.scenes);
    const updatedScenes = projectData.scenes.map((s, idx) => ({
      ...s,
      thumbnailPath: newThumbnails[idx] || null,
      thumbnailCacheBust: Date.now(),
      background: s.id === sceneId ? { type: backgroundType, value: backgroundValue } : s.background
    }));

    // Update project
    const updatedProjectData = {
      ...projectData,
      filePath: `edited-${outputVideoId}.mp4`,
      duration: newVideoDuration,
      scenes: updatedScenes,
      frames: allFrames,
      updatedAt: new Date().toISOString()
    };

    console.log('✅ Writing updated project data...');
    await fs.writeJSON(projectPath, updatedProjectData, { spaces: 2 });

    // Cleanup temp files
    console.log('✅ Cleaning up temp files...');
    await fs.remove(jobDir).catch(() => {});

    console.log('✅ Sending success response to frontend...');
    res.json({
      success: true,
      message: 'Background replaced successfully',
      videoPath: `edited-${outputVideoId}.mp4`
    });
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('Error replacing background:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to replace background' 
    });
  }
});

/**
 * POST /api/background/process
 * Step 1: Process scene with Python (background removal)
 * Returns jobId for the merge step
 */
router.post('/process', async (req, res) => {
  try {
    const { projectId, sceneId, backgroundType, backgroundValue } = req.body;

    if (!projectId || !sceneId || !backgroundType || !backgroundValue) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, sceneId, backgroundType, backgroundValue' 
      });
    }

    console.log(`[Process Step] Processing background removal for scene ${sceneId} in project ${projectId}`);
    console.log(`[Process Step] Base directories:`);
    console.log(`  - Upload directory: ${uploadDir}`);
    console.log(`  - Temp directory: ${tempDir}`);

    // Load project data
    const projectPath = join(uploadDir, `${projectId}.json`);
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = await fs.readJSON(projectPath);
    const scene = projectData.scenes.find(s => s.id === sceneId);
    
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const originalVideoPath = join(uploadDir, projectData.filePath);
    if (!fs.existsSync(originalVideoPath)) {
      return res.status(404).json({ error: 'Original video not found' });
    }

    // Create temp directory for this processing job
    const jobId = uuidv4();
    const jobDir = join(tempDir, `bg-remove-${jobId}`);
    await fs.ensureDir(jobDir);
    const framesDir = join(jobDir, 'frames');

    // Process scene with Python
    const processedScenePath = join(jobDir, 'processed-scene.mp4');
    
    console.log('[Process Step] Processing scene with Python...');
    console.log(`[Process Step] Full paths:`);
    console.log(`  - Original video: ${originalVideoPath} (exists: ${fs.existsSync(originalVideoPath)})`);
    console.log(`  - Job directory: ${jobDir}`);
    console.log(`  - Frames directory: ${framesDir}`);
    console.log(`  - Processed scene output: ${processedScenePath}`);
    console.log(`  - Project path: ${projectPath} (exists: ${fs.existsSync(projectPath)})`);
    
    // Prepare background value
    let bgValue = backgroundValue;
    if (backgroundType === 'image') {
      if (backgroundValue.startsWith('/assets/')) {
        bgValue = `http://localhost:3000${backgroundValue}`;
      } else if (!backgroundValue.startsWith('http') && !backgroundValue.startsWith('/')) {
        bgValue = backgroundValue;
      }
    }

    // Call Python script
    const pythonScript = join(__dirname, '../services/mediapipe_bg_removal.py');
    const sceneDuration = scene.end - scene.start;
    let processingFps = 12;
    if (sceneDuration <= 1.5) {
      processingFps = 8;
    } else if (sceneDuration <= 4) {
      processingFps = 10;
    }

    const inputData = JSON.stringify({
      input_video: originalVideoPath,
      scene_start: scene.start,
      scene_end: scene.end,
      output_video: processedScenePath,
      background_type: backgroundType,
      background_value: bgValue,
      frames_dir: framesDir,
      similarity_threshold: 0.05,
      processing_fps: processingFps,
      use_fast_model: true
    });

    // Use virtual environment Python if available
    const pythonCmd = fs.existsSync('/opt/venv/bin/python3') 
      ? '/opt/venv/bin/python3' 
      : 'python3';
    
    console.log(`[Process Step] Starting Python processing...`);
    
    const timeout = Math.min(
      (2 * 60 + sceneDuration * 30) * 1000,
      10 * 60 * 1000
    );
    const startTime = Date.now();
    
    const { spawn } = await import('child_process');
    
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      const pythonProc = spawn(pythonCmd, [pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let processFinished = false;
      
      pythonProc.stdin.write(inputData);
      pythonProc.stdin.end();
      
      pythonProc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProc.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        output.split('\n').forEach(line => {
          if (line.trim()) {
            console.log(`  [Python] ${line}`);
          }
        });
      });
      
      pythonProc.on('close', (code) => {
        if (processFinished) return;
        processFinished = true;
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Process Step] Python script completed in ${elapsed} seconds (exit code: ${code})`);
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            if (!result.success) {
              reject(new Error(result.error || 'Python processing failed'));
            } else {
              console.log(`[Process Step] ✅ Processed ${result.processed_frames} frames`);
              resolve({ stdout, stderr });
            }
          } catch (parseError) {
            console.error('[Process Step] Failed to parse Python output:', stdout);
            reject(new Error(`Python script returned invalid JSON. Output: ${stdout.substring(0, 200)}`));
          }
        } else {
          reject(new Error(`Python script exited with code ${code}. Stderr: ${stderr.substring(0, 500)}`));
        }
      });
      
      pythonProc.on('error', (error) => {
        if (processFinished) return;
        processFinished = true;
        reject(new Error(`Failed to start Python script: ${error.message}`));
      });
      
      const timeoutId = setTimeout(() => {
        if (processFinished) return;
        processFinished = true;
        pythonProc.kill('SIGTERM');
        console.error(`[Process Step] Python script timeout after ${(timeout / 1000).toFixed(0)} seconds`);
        reject(new Error(`Python script execution timeout (${(timeout / 1000 / 60).toFixed(1)} minutes)`));
      }, timeout);
      
      pythonProc.on('close', () => {
        clearTimeout(timeoutId);
      });
    });

    // Save job metadata for merge step
    const jobMetadata = {
      jobId,
      projectId,
      sceneId,
      backgroundType,
      backgroundValue,
      processedScenePath,
      originalVideoPath,
      sceneStart: scene.start,
      sceneEnd: scene.end,
      createdAt: new Date().toISOString()
    };
    
    await fs.writeJSON(join(jobDir, 'job.json'), jobMetadata, { spaces: 2 });
    console.log(`[Process Step] ✅ Job metadata saved. Job ID: ${jobId}`);

    // Return jobId for frontend to call merge endpoint
    res.json({
      success: true,
      jobId,
      message: 'Background processing complete. Ready for merge.',
      progress: 50
    });
    
  } catch (error) {
    console.error('[Process Step] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process background removal' 
    });
  }
});

/**
 * POST /api/background/merge
 * Step 2: Merge processed scene back into main video and update project
 */
router.post('/merge', async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ 
        error: 'Missing required field: jobId' 
      });
    }

    console.log(`[Merge Step] Starting merge for job ${jobId}`);
    console.log(`[Merge Step] Base directories:`);
    console.log(`  - Upload directory: ${uploadDir}`);
    console.log(`  - Temp directory: ${tempDir}`);

    // Load job metadata
    const jobDir = join(tempDir, `bg-remove-${jobId}`);
    console.log(`[Merge Step] Job directory: ${jobDir}`);
    const jobMetadataPath = join(jobDir, 'job.json');
    
    if (!fs.existsSync(jobMetadataPath)) {
      return res.status(404).json({ error: 'Job not found. Processing may have failed.' });
    }

    const jobMetadata = await fs.readJSON(jobMetadataPath);
    const {
      projectId,
      sceneId,
      backgroundType,
      backgroundValue,
      processedScenePath,
      originalVideoPath,
      sceneStart,
      sceneEnd
    } = jobMetadata;

    // Verify processed scene exists
    if (!fs.existsSync(processedScenePath)) {
      return res.status(404).json({ error: 'Processed scene video not found' });
    }

    // Load project data
    const projectPath = join(uploadDir, `${projectId}.json`);
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = await fs.readJSON(projectPath);
    const scene = projectData.scenes.find(s => s.id === sceneId);
    
    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    console.log(`[Merge Step] Replacing scene in main video: ${sceneStart}s - ${sceneEnd}s`);
    console.log(`[Merge Step] Full paths:`);
    console.log(`  - Original video: ${originalVideoPath} (exists: ${fs.existsSync(originalVideoPath)})`);
    console.log(`  - Processed scene: ${processedScenePath} (exists: ${fs.existsSync(processedScenePath)})`);
    console.log(`  - Project path: ${projectPath} (exists: ${fs.existsSync(projectPath)})`);

    // Replace scene in main video
    const outputVideoId = uuidv4();
    const outputVideoPath = join(uploadDir, `edited-${outputVideoId}.mp4`);
    console.log(`  - Output video: ${outputVideoPath}`);
    
    const mergeStartTime = Date.now();
    await new Promise((resolve, reject) => {
      let ffmpegProcess = null;
      let mergeTimeout = null;
      
      const safeResolve = () => {
        if (mergeTimeout) clearTimeout(mergeTimeout);
        resolve();
      };
      const safeReject = (err) => {
        if (mergeTimeout) clearTimeout(mergeTimeout);
        reject(err);
      };
      
      mergeTimeout = setTimeout(() => {
        if (ffmpegProcess) {
          console.error('[Merge Step] FFmpeg merge timeout after 5 minutes');
          ffmpegProcess.kill('SIGTERM');
          safeReject(new Error('FFmpeg merge timeout after 5 minutes'));
        }
      }, 5 * 60 * 1000);
      
      if (sceneStart > 0 && sceneEnd < projectData.duration) {
        // Scene is in the middle
        const filterComplex = `[0:v]trim=0:${sceneStart},setpts=PTS-STARTPTS[v1];
[0:a]atrim=0:${sceneStart},asetpts=PTS-STARTPTS[a1];
[1:v]setpts=PTS-STARTPTS[v2];
[1:a]asetpts=PTS-STARTPTS[a2];
[0:v]trim=${sceneEnd},setpts=PTS-STARTPTS[v3];
[0:a]atrim=${sceneEnd},asetpts=PTS-STARTPTS[a3];
[v1][a1][v2][a2][v3][a3]concat=n=3:v=1:a=1[outv][outa]`;

        console.log('[Merge Step] Starting FFmpeg merge (middle scene)...');
        ffmpegProcess = ffmpeg()
          .input(originalVideoPath)
          .input(processedScenePath)
          .input(originalVideoPath)
          .complexFilter(filterComplex)
          .outputOptions(['-map', '[outv]', '-map', '[outa]'])
          .output(outputVideoPath)
          .on('start', (cmd) => {
            console.log('[Merge Step] FFmpeg command started');
          })
          .on('progress', (progress) => {
            console.log(`[Merge Step] FFmpeg progress: ${JSON.stringify(progress)}`);
          })
          .on('end', () => {
            const elapsed = ((Date.now() - mergeStartTime) / 1000).toFixed(1);
            console.log(`[Merge Step] ✅ FFmpeg merge completed in ${elapsed}s`);
            safeResolve();
          })
          .on('error', (err) => {
            console.error('[Merge Step] ❌ FFmpeg merge error:', err);
            safeReject(err);
          })
          .run();
      } else if (sceneStart === 0) {
        // Scene is at the beginning
        const filterComplex = `[0:v]setpts=PTS-STARTPTS[v1];
[0:a]asetpts=PTS-STARTPTS[a1];
[1:v]trim=${sceneEnd},setpts=PTS-STARTPTS[v2];
[1:a]atrim=${sceneEnd},asetpts=PTS-STARTPTS[a2];
[v1][a1][v2][a2]concat=n=2:v=1:a=1[outv][outa]`;
        
        console.log('[Merge Step] Starting FFmpeg merge (beginning scene)...');
        ffmpegProcess = ffmpeg()
          .input(processedScenePath)
          .input(originalVideoPath)
          .complexFilter(filterComplex)
          .outputOptions(['-map', '[outv]', '-map', '[outa]'])
          .output(outputVideoPath)
          .on('start', (cmd) => {
            console.log('[Merge Step] FFmpeg command started');
          })
          .on('progress', (progress) => {
            console.log(`[Merge Step] FFmpeg progress: ${JSON.stringify(progress)}`);
          })
          .on('end', () => {
            const elapsed = ((Date.now() - mergeStartTime) / 1000).toFixed(1);
            console.log(`[Merge Step] ✅ FFmpeg merge completed in ${elapsed}s`);
            safeResolve();
          })
          .on('error', (err) => {
            console.error('[Merge Step] ❌ FFmpeg merge error:', err);
            safeReject(err);
          })
          .run();
      } else {
        // Scene is at the end
        const filterComplex = `[0:v]trim=0:${sceneStart},setpts=PTS-STARTPTS[v1];
[0:a]atrim=0:${sceneStart},asetpts=PTS-STARTPTS[a1];
[1:v]setpts=PTS-STARTPTS[v2];
[1:a]asetpts=PTS-STARTPTS[a2];
[v1][a1][v2][a2]concat=n=2:v=1:a=1[outv][outa]`;
        
        console.log('[Merge Step] Starting FFmpeg merge (end scene)...');
        ffmpegProcess = ffmpeg()
          .input(originalVideoPath)
          .input(processedScenePath)
          .complexFilter(filterComplex)
          .outputOptions(['-map', '[outv]', '-map', '[outa]'])
          .output(outputVideoPath)
          .on('start', (cmd) => {
            console.log('[Merge Step] FFmpeg command started');
          })
          .on('progress', (progress) => {
            console.log(`[Merge Step] FFmpeg progress: ${JSON.stringify(progress)}`);
          })
          .on('end', () => {
            const elapsed = ((Date.now() - mergeStartTime) / 1000).toFixed(1);
            console.log(`[Merge Step] ✅ FFmpeg merge completed in ${elapsed}s`);
            safeResolve();
          })
          .on('error', (err) => {
            console.error('[Merge Step] ❌ FFmpeg merge error:', err);
            safeReject(err);
          })
          .run();
      }
    });

    console.log('[Merge Step] ✅ Video merge complete. Getting video duration...');
    
    // Get new video duration
    const newVideoDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(outputVideoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
    });

    // Re-extract frames for all scenes
    console.log('[Merge Step] Re-extracting frames for all scenes...');
    const allFrames = [];
    for (const s of projectData.scenes) {
      const sceneFrames = await extractSceneFrames(
        outputVideoPath,
        projectId,
        s.id,
        s.start,
        s.end
      );
      
      const cacheBust = Date.now();
      const framesWithMetadata = sceneFrames.map((frame, frameIdx) => ({
        ...frame,
        id: frame.id || `frame-${projectId}-${s.id}-${frameIdx}`,
        sceneId: s.id,
        cacheBust: cacheBust
      }));
      
      allFrames.push(...framesWithMetadata);
    }

    allFrames.sort((a, b) => a.time - b.time);

    // Regenerate thumbnails
    const newThumbnails = await generateThumbnails(outputVideoPath, projectId, projectData.scenes);
    const updatedScenes = projectData.scenes.map((s) => ({
      ...s,
      thumbnailPath: newThumbnails[projectData.scenes.indexOf(s)] || null,
      thumbnailCacheBust: Date.now(),
      background: s.id === sceneId ? { type: backgroundType, value: backgroundValue } : s.background
    }));

    // Update project
    const updatedProjectData = {
      ...projectData,
      filePath: `edited-${outputVideoId}.mp4`,
      duration: newVideoDuration,
      scenes: updatedScenes,
      frames: allFrames,
      updatedAt: new Date().toISOString()
    };

    console.log('[Merge Step] ✅ Writing updated project data...');
    await fs.writeJSON(projectPath, updatedProjectData, { spaces: 2 });

    // Cleanup temp files
    console.log('[Merge Step] ✅ Cleaning up temp files...');
    await fs.remove(jobDir).catch(() => {});

    console.log('[Merge Step] ✅ Sending success response to frontend...');
    res.json({
      success: true,
      message: 'Background replaced successfully',
      videoPath: `edited-${outputVideoId}.mp4`,
      progress: 100
    });
    
  } catch (error) {
    console.error('[Merge Step] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to merge video' 
    });
  }
});

export default router;

