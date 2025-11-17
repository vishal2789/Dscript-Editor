import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { extractSceneFrames, generateThumbnails } from '../services/ffmpeg.js';
import { downloadStockVideo } from '../services/stockMedia.js';
import { transcribeAudio } from '../services/openai.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
const stockDir = join(uploadDir, 'stock');
fs.ensureDirSync(stockDir);

/**
 * POST /api/scenes/delete
 * Delete a scene from the video and regenerate all frames/scenes
 */
router.post('/delete', async (req, res) => {
  try {
    const { projectId, sceneId } = req.body;

    if (!projectId || !sceneId) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, sceneId' 
      });
    }

    console.log(`Deleting scene ${sceneId} from project ${projectId}`);

    // Load project data
    const projectPath = join(uploadDir, `${projectId}.json`);
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = await fs.readJSON(projectPath);
    const sceneIndex = projectData.scenes.findIndex(s => s.id === sceneId);
    
    if (sceneIndex === -1) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    const deletedScene = projectData.scenes[sceneIndex];
    const sceneStart = deletedScene.start;
    const sceneEnd = deletedScene.end;
    const sceneDuration = sceneEnd - sceneStart;

    console.log(`Deleting scene: ${sceneStart}s - ${sceneEnd}s (duration: ${sceneDuration}s)`);

    // Remove the scene and shift subsequent scenes backward
    const updatedScenes = [];
    projectData.scenes.forEach((scene, idx) => {
      if (scene.id === sceneId) {
        return;
      }
      if (idx > sceneIndex) {
        updatedScenes.push({
          ...scene,
          start: scene.start - sceneDuration,
          end: scene.end - sceneDuration
        });
      } else {
        updatedScenes.push({ ...scene });
      }
    });

    // Remove the scene from the video file (ensure audio + video stay in sync)
    const originalVideoPath = join(uploadDir, projectData.filePath);
    if (!fs.existsSync(originalVideoPath)) {
      return res.status(404).json({ error: 'Original video not found' });
    }

    const outputVideoId = uuidv4();
    const outputVideoPath = join(uploadDir, `edited-${outputVideoId}.mp4`);
    const tempDir = join(uploadDir, 'temp', `delete-${Date.now()}`);
    await fs.ensureDir(tempDir);

    const segments = [];
    const createSegment = async (start, end, label) => {
      const segmentDuration = end - start;
      if (segmentDuration <= 0.01) return;
      const segmentPath = join(tempDir, `${label}-${Date.now()}.mp4`);
      await new Promise((resolve, reject) => {
        ffmpeg(originalVideoPath)
          .setStartTime(start)
          .setDuration(segmentDuration)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-preset', 'medium',
            '-crf', '18',
            '-movflags', 'faststart'
          ])
          .output(segmentPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      segments.push(segmentPath);
    };

    console.log('Removing scene from video file...');
    await createSegment(0, sceneStart, 'before');
    await createSegment(sceneEnd, projectData.duration, 'after');

    if (segments.length === 0) {
      await fs.remove(tempDir);
      return res.status(400).json({ error: 'Cannot delete entire video' });
    }

    if (segments.length === 1) {
      await fs.copy(segments[0], outputVideoPath);
    } else {
      const concatListPath = join(tempDir, `concat-${Date.now()}.txt`);
      const concatFileContents = segments
        .map(file => `file '${file.replace(/'/g, "'\\''")}'`)
        .join('\n');
      await fs.writeFile(concatListPath, concatFileContents);

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy'])
          .output(outputVideoPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
    }

    await fs.remove(tempDir);

    // Get new video duration
    const newVideoDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(outputVideoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
    });

    console.log(`✅ New video duration: ${newVideoDuration}s (original: ${projectData.duration}s)`);

    // Delete all old frames and thumbnails
    console.log('🗑️  Deleting all old frames and thumbnails...');
    
    const framesBaseDir = join(uploadDir, 'frames', projectId);
    if (fs.existsSync(framesBaseDir)) {
      await fs.remove(framesBaseDir);
      console.log('   ✅ Deleted all old frames');
    }
    await fs.ensureDir(framesBaseDir);
    
    const thumbnailsDir = join(uploadDir, 'thumbnails', projectId);
    if (fs.existsSync(thumbnailsDir)) {
      await fs.remove(thumbnailsDir);
      console.log('   ✅ Deleted all old thumbnails');
    }
    await fs.ensureDir(thumbnailsDir);

    // Re-extract frames for all remaining scenes
    console.log('📸 Re-extracting frames for all scenes from final video...');
    const allFrames = [];
    for (let i = 0; i < updatedScenes.length; i++) {
      const scene = updatedScenes[i];
      const sceneFrames = await extractSceneFrames(
        outputVideoPath,
        projectId,
        scene.id,
        scene.start,
        scene.end
      );
      
      const cacheBust = Date.now();
      const framesWithMetadata = sceneFrames.map((frame, frameIdx) => ({
        ...frame,
        id: frame.id || `frame-${projectId}-${scene.id}-${frameIdx}`,
        sceneId: scene.id,
        cacheBust
      }));
      
      allFrames.push(...framesWithMetadata);
      console.log(`   ✅ Extracted ${sceneFrames.length} frames for scene ${i} (${scene.id})`);
    }

    allFrames.sort((a, b) => a.time - b.time);

    // Regenerate thumbnails
    console.log('🖼️  Regenerating all thumbnails from final video...');
    const newThumbnails = await generateThumbnails(outputVideoPath, projectId, updatedScenes);
    const thumbnailCacheBust = Date.now();
    const updatedScenesWithThumbnails = updatedScenes.map((scene, idx) => ({
      ...scene,
      thumbnailPath: newThumbnails[idx] || null,
      thumbnailCacheBust
    }));

    // Shift transcript segments
    let updatedSegments = (projectData.transcriptionSegments || []).reduce((acc, segment) => {
      if (segment.end <= sceneStart) {
        acc.push({ ...segment });
        return acc;
      }

      if (segment.start >= sceneEnd) {
        acc.push({
          ...segment,
          start: segment.start - sceneDuration,
          end: segment.end - sceneDuration
        });
        return acc;
      }

      return acc;
    }, []);

    let fullTranscript = updatedSegments.map(s => s.text).join(' ');

    try {
      console.log('📝 Regenerating transcript from updated video...');
      const transcription = await transcribeAudio(outputVideoPath);
      if (transcription?.segments?.length) {
        updatedSegments = transcription.segments.map((seg, idx) => ({
          id: `seg-${Date.now()}-${idx}`,
          start: seg.start,
          end: seg.end,
          speaker: seg.speaker || null,
          text: seg.text
        }));
        fullTranscript = transcription.text || updatedSegments.map(s => s.text).join(' ');
        console.log(`📝 Regenerated transcript with ${updatedSegments.length} segments`);
      }
    } catch (err) {
      console.warn('Failed to regenerate transcript, using fallback segments:', err.message);
    }

    const updatedProjectData = {
      ...projectData,
      filePath: `edited-${outputVideoId}.mp4`,
      duration: newVideoDuration,
      scenes: updatedScenesWithThumbnails,
      frames: allFrames,
      transcriptionSegments: updatedSegments,
      fullTranscript,
      updatedAt: new Date().toISOString()
    };

    await fs.writeJSON(projectPath, updatedProjectData, { spaces: 2 });

    res.json({
      success: true,
      message: 'Scene deleted successfully. Timeline and frames regenerated.',
      videoPath: `edited-${outputVideoId}.mp4`,
      videoUrl: `/uploads/edited-${outputVideoId}.mp4`
    });
  } catch (error) {
    console.error('Error deleting scene:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete scene' 
    });
  }
});

/**
 * POST /api/scenes/add
 * Add a new scene from uploaded video file
 */
router.post('/add', async (req, res) => {
  try {
    const { projectId, insertTime, videoPath, videoId, duration } = req.body;

    if (!projectId || insertTime === undefined || !videoPath || !duration) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, insertTime, videoPath, duration' 
      });
    }

    console.log(`Adding new scene to project ${projectId} at time ${insertTime}s`);

    // Load project data
    const projectPath = join(uploadDir, `${projectId}.json`);
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = await fs.readJSON(projectPath);
    const originalVideoPath = join(uploadDir, projectData.filePath);
    const newVideoPath = join(uploadDir, videoPath);

    if (!fs.existsSync(originalVideoPath) || !fs.existsSync(newVideoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Create new scene
    const newSceneId = `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSceneStart = insertTime;
    const newSceneEnd = insertTime + duration;

    // Shift existing scenes that start after insertTime
    const updatedScenes = projectData.scenes.map(scene => {
      if (scene.start >= insertTime) {
        return {
          ...scene,
          start: scene.start + duration,
          end: scene.end + duration
        };
      }
      return { ...scene };
    });

    // Insert new scene at the correct position
    updatedScenes.push({
      id: newSceneId,
      start: newSceneStart,
      end: newSceneEnd,
      thumbnailPath: null // Will be generated below
    });

    // Sort scenes by start time
    updatedScenes.sort((a, b) => a.start - b.start);

    // Merge videos: original video + new video at insertTime
    const outputVideoId = uuidv4();
    const outputVideoPath = join(uploadDir, `edited-${outputVideoId}.mp4`);

    console.log(`Merging videos: inserting ${duration}s at ${insertTime}s`);

    // Use FFmpeg to concatenate videos
    // Split original video at insertTime, insert new video, then append rest
    await new Promise((resolve, reject) => {
      // Create a complex filter to insert the video
      const filterComplex = `[0:v]trim=0:${insertTime},setpts=PTS-STARTPTS[v1];
[0:a]atrim=0:${insertTime},asetpts=PTS-STARTPTS[a1];
[1:v]setpts=PTS-STARTPTS[v2];
[1:a]asetpts=PTS-STARTPTS[a2];
[0:v]trim=${insertTime},setpts=PTS-STARTPTS[v3];
[0:a]atrim=${insertTime},asetpts=PTS-STARTPTS[a3];
[v1][a1][v2][a2][v3][a3]concat=n=3:v=1:a=1[outv][outa]`;

      ffmpeg()
        .input(originalVideoPath)
        .input(newVideoPath)
        .input(originalVideoPath)
        .complexFilter(filterComplex)
        .outputOptions(['-map', '[outv]', '-map', '[outa]'])
        .output(outputVideoPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

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
    for (const scene of updatedScenes) {
      const sceneFrames = await extractSceneFrames(
        outputVideoPath,
        projectId,
        scene.id,
        scene.start,
        scene.end
      );
      
      const cacheBust = Date.now();
      const framesWithMetadata = sceneFrames.map((frame, frameIdx) => ({
        ...frame,
        id: frame.id || `frame-${projectId}-${scene.id}-${frameIdx}`,
        sceneId: scene.id,
        cacheBust: cacheBust
      }));
      
      allFrames.push(...framesWithMetadata);
    }

    allFrames.sort((a, b) => a.time - b.time);

    // Regenerate thumbnails
    const newThumbnails = await generateThumbnails(outputVideoPath, projectId, updatedScenes);
    const updatedScenesWithThumbnails = updatedScenes.map((scene, idx) => ({
      ...scene,
      thumbnailPath: newThumbnails[idx] || null,
      thumbnailCacheBust: Date.now()
    }));

    // Update project
    const updatedProjectData = {
      ...projectData,
      filePath: `edited-${outputVideoId}.mp4`,
      duration: newVideoDuration,
      scenes: updatedScenesWithThumbnails,
      frames: allFrames,
      updatedAt: new Date().toISOString()
    };

    await fs.writeJSON(projectPath, updatedProjectData, { spaces: 2 });

    const newScene = updatedScenesWithThumbnails.find(s => s.id === newSceneId);

    res.json({
      success: true,
      message: 'Scene added successfully',
      newScene: newScene,
      videoPath: `edited-${outputVideoId}.mp4`
    });
  } catch (error) {
    console.error('Error adding scene:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to add scene' 
    });
  }
});

/**
 * POST /api/scenes/add-stock
 * Add a new scene from stock media
 */
router.post('/add-stock', async (req, res) => {
  try {
    const { projectId, insertTime, stockVideoUrl, stockVideoDuration } = req.body;

    if (!projectId || insertTime === undefined || !stockVideoUrl || !stockVideoDuration) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, insertTime, stockVideoUrl, stockVideoDuration' 
      });
    }

    console.log(`Adding new scene from stock media to project ${projectId} at time ${insertTime}s`);

    // Load project data
    const projectPath = join(uploadDir, `${projectId}.json`);
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectData = await fs.readJSON(projectPath);
    const originalVideoPath = join(uploadDir, projectData.filePath);

    if (!fs.existsSync(originalVideoPath)) {
      return res.status(404).json({ error: 'Original video not found' });
    }

    // Download stock video
    const stockVideoId = uuidv4();
    const stockVideoPath = join(stockDir, `stock-${stockVideoId}.mp4`);
    await downloadStockVideo(stockVideoUrl, stockVideoPath);

    // Create new scene
    const newSceneId = `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSceneStart = insertTime;
    const newSceneEnd = insertTime + stockVideoDuration;

    // Shift existing scenes that start after insertTime
    const updatedScenes = projectData.scenes.map(scene => {
      if (scene.start >= insertTime) {
        return {
          ...scene,
          start: scene.start + stockVideoDuration,
          end: scene.end + stockVideoDuration
        };
      }
      return { ...scene };
    });

    // Insert new scene
    updatedScenes.push({
      id: newSceneId,
      start: newSceneStart,
      end: newSceneEnd,
      thumbnailPath: null
    });

    updatedScenes.sort((a, b) => a.start - b.start);

    // Merge videos
    const outputVideoId = uuidv4();
    const outputVideoPath = join(uploadDir, `edited-${outputVideoId}.mp4`);

    await new Promise((resolve, reject) => {
      const filterComplex = `[0:v]trim=0:${insertTime},setpts=PTS-STARTPTS[v1];
[0:a]atrim=0:${insertTime},asetpts=PTS-STARTPTS[a1];
[1:v]setpts=PTS-STARTPTS[v2];
[1:a]asetpts=PTS-STARTPTS[a2];
[0:v]trim=${insertTime},setpts=PTS-STARTPTS[v3];
[0:a]atrim=${insertTime},asetpts=PTS-STARTPTS[a3];
[v1][a1][v2][a2][v3][a3]concat=n=3:v=1:a=1[outv][outa]`;

      ffmpeg()
        .input(originalVideoPath)
        .input(stockVideoPath)
        .input(originalVideoPath)
        .complexFilter(filterComplex)
        .outputOptions(['-map', '[outv]', '-map', '[outa]'])
        .output(outputVideoPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

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
    for (const scene of updatedScenes) {
      const sceneFrames = await extractSceneFrames(
        outputVideoPath,
        projectId,
        scene.id,
        scene.start,
        scene.end
      );
      
      const cacheBust = Date.now();
      const framesWithMetadata = sceneFrames.map((frame, frameIdx) => ({
        ...frame,
        id: frame.id || `frame-${projectId}-${scene.id}-${frameIdx}`,
        sceneId: scene.id,
        cacheBust: cacheBust
      }));
      
      allFrames.push(...framesWithMetadata);
    }

    allFrames.sort((a, b) => a.time - b.time);

    // Regenerate thumbnails
    const newThumbnails = await generateThumbnails(outputVideoPath, projectId, updatedScenes);
    const updatedScenesWithThumbnails = updatedScenes.map((scene, idx) => ({
      ...scene,
      thumbnailPath: newThumbnails[idx] || null,
      thumbnailCacheBust: Date.now()
    }));

    // Update project
    const updatedProjectData = {
      ...projectData,
      filePath: `edited-${outputVideoId}.mp4`,
      duration: newVideoDuration,
      scenes: updatedScenesWithThumbnails,
      frames: allFrames,
      updatedAt: new Date().toISOString()
    };

    await fs.writeJSON(projectPath, updatedProjectData, { spaces: 2 });

    const newScene = updatedScenesWithThumbnails.find(s => s.id === newSceneId);

    res.json({
      success: true,
      message: 'Scene added from stock media successfully',
      newScene: newScene,
      videoPath: `edited-${outputVideoId}.mp4`
    });
  } catch (error) {
    console.error('Error adding scene from stock media:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to add scene from stock media' 
    });
  }
});

export default router;

