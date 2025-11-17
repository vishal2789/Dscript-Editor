import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';
import os from 'os';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
const exportDir = process.env.EXPORT_DIR || join(__dirname, '../exports');
const thumbnailsDir = join(uploadDir, 'thumbnails');
const framesBaseDir = join(uploadDir, 'frames');

fs.ensureDirSync(thumbnailsDir);
fs.ensureDirSync(exportDir);
fs.ensureDirSync(framesBaseDir);

/**
 * Detect scene changes in video
 * Returns array of {start, end} timestamps
 */
export async function detectScenes(filePath, uploadId) {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }

    const scenes = [];
    let lastSceneTime = 0;

    // Use FFmpeg scene detection filter
    // Output to null device (we only need the stderr output for scene detection)
    // Use platform-agnostic null device
    const nullOutput = os.platform() === 'win32' ? 'NUL' : '/dev/null';
    const command = ffmpeg(filePath)
      .outputOptions([
        '-vf', 'select=gt(scene\\,0.35),showinfo',
        '-f', 'null'
      ])
      .output(nullOutput) // Explicit output path (null device)
      .on('stderr', (stderrLine) => {
        // Parse showinfo output for scene change timestamps
        const ptsMatch = stderrLine.match(/pts_time:([\d.]+)/);
        if (ptsMatch) {
          const sceneTime = parseFloat(ptsMatch[1]);
          if (sceneTime > lastSceneTime + 0.5) { // Minimum 0.5s between scenes
            scenes.push({
              start: lastSceneTime,
              end: sceneTime
            });
            lastSceneTime = sceneTime;
          }
        }
      })
      .on('end', () => {
        // Get video duration to set final scene end
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.warn('Could not get video duration:', err);
            if (scenes.length > 0) {
              scenes[scenes.length - 1].end = lastSceneTime + 5; // Default 5s
            } else {
              scenes.push({ start: 0, end: 60 }); // Default 1 minute
            }
          } else {
            const duration = metadata.format.duration || 0;
            if (scenes.length > 0) {
              scenes[scenes.length - 1].end = duration;
            } else {
              // No scenes detected, create one scene for entire video
              scenes.push({ start: 0, end: duration || 60 });
            }
          }
          console.log(`Detected ${scenes.length} scenes`);
          resolve(scenes);
        });
      })
      .on('error', (err) => {
        // If scene detection fails, create single scene
        console.warn('Scene detection failed, using single scene:', err.message);
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.warn('Could not probe file, using default duration');
            resolve([{ start: 0, end: 60 }]);
          } else {
            const duration = metadata.format.duration || 60;
            resolve([{ start: 0, end: duration }]);
          }
        });
      });

    command.run();
  });
}

/**
 * Extract video frames at 0.5 second intervals for filmstrip display
 * Returns array of frame paths with timestamps
 */
export async function extractVideoFrames(filePath, uploadId, duration) {
  const framesDir = join(uploadDir, 'frames', uploadId);
  fs.ensureDirSync(framesDir);
  
  const frames = [];
  const frameInterval = 0.5; // Extract frame every 0.5 seconds for smooth filmstrip
  
  if (!duration || duration <= 0) {
    return frames;
  }
  
  const totalFrames = Math.ceil(duration / frameInterval);
  console.log(`Extracting ${totalFrames} frames (every ${frameInterval} seconds)...`);
  
  try {
    const framePattern = join(framesDir, 'frame-%04d.jpg');
    
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .outputOptions([
          '-vf', `fps=1/${frameInterval}`, // 1 frame every N seconds (2 fps)
          '-q:v', '3', // Higher quality for better preview
          '-s', '120x68' // Compact size for filmstrip (16:9 ratio)
        ])
        .output(framePattern)
        .on('end', () => {
          console.log('Frame extraction complete');
          resolve();
        })
        .on('error', (err) => {
          console.warn('Frame extraction error:', err.message);
          reject(err);
        })
        .run();
    });
    
    // Collect all extracted frames with unique IDs
    for (let i = 1; i <= totalFrames; i++) {
      const frameNum = String(i).padStart(4, '0');
      const framePath = join(framesDir, `frame-${frameNum}.jpg`);
      if (fs.existsSync(framePath)) {
        frames.push({
          id: `frame-${uploadId}-${i}`, // ✅ FIX: Unique ID for each frame
          time: (i - 1) * frameInterval,
          path: `/uploads/frames/${uploadId}/frame-${frameNum}.jpg`,
          sceneId: null // Will be set when frames are assigned to scenes
        });
      }
    }
    
    console.log(`Extracted ${frames.length} frames successfully`);
  } catch (error) {
    console.warn('Frame extraction failed, continuing without frames:', error.message);
  }
  
  return frames;
}

/**
 * Extract frames for a specific scene at high frequency
 * Used for detailed filmstrip display per scene
 */
export async function extractSceneFrames(filePath, uploadId, sceneId, sceneStart, sceneEnd) {
  const framesDir = join(uploadDir, 'frames', uploadId, sceneId);
  fs.ensureDirSync(framesDir);
  
  const frames = [];
  const frameInterval = 0.5; // Frame every 0.5 seconds
  const sceneDuration = sceneEnd - sceneStart;
  
  if (sceneDuration <= 0) {
    return frames;
  }
  
  try {
    const framePattern = join(framesDir, 'frame-%04d.jpg');
    
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .seekInput(sceneStart)
        .duration(sceneDuration)
        .outputOptions([
          '-vf', `fps=1/${frameInterval}`,
          '-q:v', '3',
          '-s', '120x68'
        ])
        .output(framePattern)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    
    const totalFrames = Math.ceil(sceneDuration / frameInterval);
    for (let i = 1; i <= totalFrames; i++) {
      const frameNum = String(i).padStart(4, '0');
      const framePath = join(framesDir, `frame-${frameNum}.jpg`);
      if (fs.existsSync(framePath)) {
        frames.push({
          id: `frame-${uploadId}-${sceneId}-${i}`, // ✅ FIX: Unique ID combining uploadId, sceneId, and index
          time: sceneStart + (i - 1) * frameInterval,
          path: `/uploads/frames/${uploadId}/${sceneId}/frame-${frameNum}.jpg`,
          sceneId: sceneId // ✅ FIX: Always set sceneId for proper filtering
        });
      }
    }
  } catch (error) {
    console.warn(`Scene frame extraction failed for ${sceneId}:`, error.message);
  }
  
  return frames;
}

/**
 * Generate thumbnails for scenes
 */
export async function generateThumbnails(filePath, uploadId, scenes) {
  const thumbnails = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const thumbnailPath = join(thumbnailsDir, `${uploadId}-scene-${i}.jpg`);
    
    // Extract thumbnail at middle of scene
    const thumbnailTime = scene.start + (scene.end - scene.start) / 2;

    try {
      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .screenshots({
            timestamps: [thumbnailTime],
            filename: `${uploadId}-scene-${i}.jpg`,
            folder: thumbnailsDir,
            size: '320x180'
          })
          .on('end', () => {
            thumbnails.push(`/uploads/thumbnails/${uploadId}-scene-${i}.jpg`);
            resolve();
          })
          .on('error', reject);
      });
    } catch (error) {
      console.error(`Failed to generate thumbnail for scene ${i}:`, error);
      thumbnails.push(null);
    }
  }

  return thumbnails;
}

/**
 * Render final video with edits, captions, and overlays
 */
export async function renderVideo(sourcePath, projectId, project, edits, outputOptions) {
  const outputFileName = `${projectId}-${Date.now()}.mp4`;
  const outputPath = join(exportDir, outputFileName);
  const srtPath = join(exportDir, `${projectId}-subtitles.srt`);

  // Build FFmpeg command
  let command = ffmpeg(sourcePath);

  // Resolution mapping (use 'x' not ':' for FFmpeg size format)
  const resolutionMap = {
    '1080p': '1920x1080',
    '720p': '1280x720',
    '480p': '854x480'
  };
  const resolution = resolutionMap[outputOptions.resolution] || resolutionMap['1080p'];

  // Codec options
  const codecOptions = {
    h264: ['-c:v', 'libx264', '-preset', 'medium', '-crf', '23'],
    vp9: ['-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0']
  };
  const codec = codecOptions[outputOptions.codec] || codecOptions.h264;

  // Build filter complex for captions and overlays
  const filters = [];
  let filterComplex = '';

  // Handle scene reordering and trimming
  const scenes = edits.scenes || project.scenes || [];
  if (scenes.length > 0 && scenes.some(s => s.start !== undefined || s.end !== undefined)) {
    // Create concat demuxer file for reordered scenes
    const concatFile = join(exportDir, `${projectId}-concat.txt`);
    const concatLines = scenes
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(scene => {
        const start = scene.start || 0;
        const end = scene.end || project.duration;
        return `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${scene.id}];[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${scene.id}]`;
      });
    
    // This is simplified - full implementation would use concat filter
    // For now, we'll use trim and overlay for captions
  }

  // Add captions if burnCaptions is true
  if (outputOptions.burnCaptions && edits.captions) {
    const captionFilters = edits.captions.map((cap, idx) => {
      const escapedText = cap.text.replace(/'/g, "\\'").replace(/:/g, "\\:");
      return `drawtext=text='${escapedText}':fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5:x=(w-text_w)/2:y=h-th-60:enable='between(t,${cap.start},${cap.end})'`;
    });
    filterComplex = captionFilters.join(',');
  }

  // Export subtitles as SRT if requested
  if (outputOptions.exportSubtitles && edits.captions) {
    await generateSRT(edits.captions, srtPath);
  }

  // Build final command
  command = command
    .videoCodec(outputOptions.codec === 'vp9' ? 'libvpx-vp9' : 'libx264')
    .audioCodec('aac')
    .size(resolution)
    .outputOptions(codec);

  if (filterComplex) {
    command = command.videoFilters(filterComplex);
  }

  command = command.output(outputPath);

  // Execute render
  await new Promise((resolve, reject) => {
    command
      .on('progress', (progress) => {
        console.log(`Rendering: ${Math.round(progress.percent || 0)}%`);
      })
      .on('end', () => {
        console.log('Render complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('Render error:', err);
        reject(err);
      })
      .run();
  });

  return outputFileName;
}

/**
 * Generate SRT subtitle file
 */
async function generateSRT(captions, outputPath) {
  let srtContent = '';
  
  captions.forEach((cap, index) => {
    const start = formatSRTTime(cap.start);
    const end = formatSRTTime(cap.end);
    srtContent += `${index + 1}\n${start} --> ${end}\n${cap.text}\n\n`;
  });

  await fs.writeFile(outputPath, srtContent, 'utf8');
}

function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

