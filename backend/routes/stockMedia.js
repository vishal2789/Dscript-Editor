import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import { 
  analyzeSceneImage, 
  searchStockVideos, 
  downloadStockVideo,
  replaceSceneWithStock 
} from '../services/stockMedia.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
const stockDir = join(uploadDir, 'stock');
fs.ensureDirSync(stockDir);

/**
 * POST /api/stock-media/analyze-scene
 * Analyze a scene thumbnail and get stock video suggestions
 */
router.post('/analyze-scene', async (req, res) => {
  try {
    const { thumbnailPath, sceneDuration } = req.body;

    if (!thumbnailPath) {
      return res.status(400).json({ error: 'Thumbnail path is required' });
    }

    // Construct full path to thumbnail
    const fullThumbnailPath = join(uploadDir, thumbnailPath.replace('/uploads/', ''));

    if (!fs.existsSync(fullThumbnailPath)) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Step 1: Analyze image with OpenAI Vision
    const keywords = await analyzeSceneImage(fullThumbnailPath);

    // Step 2: Search stock videos with duration filter
    const stockVideos = await searchStockVideos(keywords, 15, sceneDuration);

    res.json({
      keywords,
      videos: stockVideos,
      sceneDuration: sceneDuration || null
    });
  } catch (error) {
    console.error('Scene analysis error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze scene and find stock videos' 
    });
  }
});

/**
 * POST /api/stock-media/search
 * Search stock videos with custom query
 */
router.post('/search', async (req, res) => {
  try {
    const { query, perPage = 15, sceneDuration } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const stockVideos = await searchStockVideos(query, perPage, sceneDuration);

    res.json({
      query,
      videos: stockVideos,
      sceneDuration: sceneDuration || null
    });
  } catch (error) {
    console.error('Stock video search error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to search stock videos' 
    });
  }
});

/**
 * POST /api/stock-media/replace-scene
 * Replace a scene with stock footage
 */
router.post('/replace-scene', async (req, res) => {
  try {
    const { projectId, sceneId, stockVideoUrl, sceneStart, sceneEnd } = req.body;

    if (!projectId || !sceneId || !stockVideoUrl || sceneStart === undefined || sceneEnd === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, sceneId, stockVideoUrl, sceneStart, sceneEnd' 
      });
    }

    console.log(`Replacing scene ${sceneId} in project ${projectId}`);

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

    // Replace scene
    const outputVideoId = uuidv4();
    const outputVideoPath = join(uploadDir, `edited-${outputVideoId}.mp4`);
    const sceneDuration = sceneEnd - sceneStart;
    
    console.log(`Original scene duration: ${sceneDuration}s (${sceneStart}s - ${sceneEnd}s)`);
    
    await replaceSceneWithStock(
      originalVideoPath,
      stockVideoPath,
      sceneStart,
      sceneEnd,
      outputVideoPath
    );
    
    // Get actual duration of the new edited video
    const newVideoDuration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(outputVideoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
    });
    
    console.log(`✅ New video duration: ${newVideoDuration}s (original: ${projectData.duration}s)`);
    const durationDiff = newVideoDuration - projectData.duration;
    console.log(`⚠️ Duration difference: ${durationDiff}s`);

    // ✅ FIX: Update scene timestamps (shift subsequent scenes if duration changed)
    // Preserve all scene IDs to maintain React key stability
    const sceneIndex = projectData.scenes.findIndex(s => s.id === sceneId);
    const updatedScenes = projectData.scenes.map((scene, idx) => {
      if (scene.id === sceneId) {
        // ✅ FIX: Update replaced scene - keep same ID, start, update end if duration changed
        const newEnd = scene.start + sceneDuration;
        return { 
          ...scene, // ✅ FIX: Preserve all properties including ID
          end: newEnd
        };
      } else if (idx > sceneIndex) {
        // ✅ FIX: Shift all subsequent scenes by the duration difference, preserve IDs
        return {
          ...scene, // ✅ FIX: Preserve all properties including ID
          start: scene.start + durationDiff,
          end: scene.end + durationDiff
        };
      } else {
        // ✅ FIX: Scenes before the replaced scene remain unchanged (but create new object reference)
        return { ...scene }; // ✅ FIX: Create new object reference for immutability
      }
    });
    
    console.log(`📝 Updated scene timestamps:`);
    updatedScenes.forEach((sc, i) => {
      console.log(`  Scene ${i} (${sc.id}): ${sc.start}s - ${sc.end}s`);
    });

    // ✅ NEW APPROACH: Delete ALL old frames and thumbnails, then re-extract everything from final video
    // This ensures perfect sync and eliminates all timing issues
    
    console.log('🗑️  Deleting all old frames and thumbnails...');
    
    // Delete all old frames
    const framesBaseDir = join(uploadDir, 'frames', projectId);
    if (fs.existsSync(framesBaseDir)) {
      await fs.remove(framesBaseDir);
      console.log('   ✅ Deleted all old frames');
    }
    await fs.ensureDir(framesBaseDir);
    
    // Delete all old thumbnails
    const thumbnailsDir = join(uploadDir, 'thumbnails', projectId);
    if (fs.existsSync(thumbnailsDir)) {
      await fs.remove(thumbnailsDir);
      console.log('   ✅ Deleted all old thumbnails');
    }
    await fs.ensureDir(thumbnailsDir);
    
    // ✅ Re-extract frames for ALL scenes from the final video
    console.log('📸 Re-extracting frames for all scenes from final video...');
    const { extractSceneFrames } = await import('../services/ffmpeg.js');
    
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
      
      // ✅ FIX: Ensure all frames have unique IDs and sceneId metadata
      // Add cache bust timestamp to force browser refresh
      const cacheBust = Date.now();
      const framesWithMetadata = sceneFrames.map((frame, frameIdx) => ({
        ...frame,
        id: frame.id || `frame-${projectId}-${scene.id}-${frameIdx}`, // ✅ FIX: Ensure unique ID
        sceneId: scene.id, // ✅ FIX: Always set sceneId
        cacheBust: cacheBust // ✅ FIX: Add cache bust timestamp for thumbnail refresh
      }));
      
      allFrames.push(...framesWithMetadata);
      console.log(`   ✅ Extracted ${sceneFrames.length} frames for scene ${i} (${scene.id})`);
    }
    
    // Sort frames by time
    allFrames.sort((a, b) => a.time - b.time);
    console.log(`📸 Total frames extracted: ${allFrames.length}`);
    
    // ✅ Regenerate ALL thumbnails from the final video
    console.log('🖼️  Regenerating all thumbnails from final video...');
    const { generateThumbnails } = await import('../services/ffmpeg.js');
    const newThumbnails = await generateThumbnails(outputVideoPath, projectId, updatedScenes);
    
    // ✅ FIX: Update scene thumbnail paths with cache busting
    const thumbnailCacheBust = Date.now();
    const updatedScenesWithThumbnails = updatedScenes.map((scene, idx) => ({
      ...scene,
      thumbnailPath: newThumbnails[idx] || null,
      thumbnailCacheBust: thumbnailCacheBust // ✅ FIX: Add cache bust for thumbnail refresh
    }));
    
    console.log(`🖼️  Regenerated ${newThumbnails.length} thumbnails`);
    
    // Use the newly extracted frames (already have correct timestamps from final video)
    const updatedFrames = allFrames;
    
    // ✅ FIX: Shift transcript segment timestamps for segments after the replaced scene
    // (Frames don't need shifting - they're extracted from final video with correct timestamps)
    const updatedSegments = (projectData.transcriptionSegments || []).map(segment => {
      if (segment.start >= sceneEnd && durationDiff !== 0) {
        return {
          ...segment,
          start: segment.start + durationDiff,
          end: segment.end + durationDiff
        };
      }
      return segment;
    });
    
    console.log(`📝 Shifted ${updatedSegments.filter(s => s.start >= sceneEnd).length} transcript segments by ${durationDiff}s`);

    const updatedProjectData = {
      ...projectData,
      filePath: `edited-${outputVideoId}.mp4`,
      originalFilePath: projectData.filePath,
      duration: newVideoDuration, // ✅ FIX: Update total duration
      scenes: updatedScenesWithThumbnails, // ✅ Use scenes with regenerated thumbnails
      frames: updatedFrames, // ✅ Use frames extracted from final video (already correct timestamps)
      transcriptionSegments: updatedSegments, // ✅ FIX: Use shifted segments
      replacedScenes: [
        ...(projectData.replacedScenes || []),
        {
          sceneId,
          sceneStart,
          sceneEnd,
          stockVideoUrl,
          durationDiff, // ✅ NEW: Track duration change
          replacedAt: new Date().toISOString()
        }
      ],
      updatedAt: new Date().toISOString()
    };

    // Save updated project
    await fs.writeJSON(projectPath, updatedProjectData, { spaces: 2 });
    
    console.log('✅ Project saved with updated frames and thumbnails');
    console.log(`   Total frames in project: ${updatedProjectData.frames.length}`);
    console.log(`   Total scenes: ${updatedProjectData.scenes.length}`);
    
    // Verify the file was written
    const savedProject = await fs.readJSON(projectPath);
    console.log(`   Verified saved project has ${savedProject.frames.length} frames`);

    res.json({
      success: true,
      message: 'Scene replaced successfully',
      videoPath: `edited-${outputVideoId}.mp4`,
      videoUrl: `/uploads/edited-${outputVideoId}.mp4`,
      updatedScene: updatedScenes.find(s => s.id === sceneId)
    });
  } catch (error) {
    console.error('Scene replacement error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to replace scene' 
    });
  }
});

/**
 * POST /api/stock-media/preview-scene
 * Generate a preview of scene replacement (just downloads stock video for preview)
 */
router.post('/preview-scene', async (req, res) => {
  try {
    const { stockVideoUrl } = req.body;

    if (!stockVideoUrl) {
      return res.status(400).json({ error: 'Stock video URL is required' });
    }

    // Download stock video for preview
    const previewId = uuidv4();
    const previewPath = join(stockDir, `preview-${previewId}.mp4`);
    await downloadStockVideo(stockVideoUrl, previewPath);

    res.json({
      success: true,
      previewUrl: `/uploads/stock/preview-${previewId}.mp4`
    });
  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate preview' 
    });
  }
});

export default router;

