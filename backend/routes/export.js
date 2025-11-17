import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import { renderVideo } from '../services/ffmpeg.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
const exportDir = process.env.EXPORT_DIR || join(__dirname, '../exports');
fs.ensureDirSync(exportDir);

/**
 * POST /api/export
 * Export video with edits, captions, and overlays
 * 
 * Body: {
 *   projectId: string,
 *   outputOptions: {
 *     resolution: '1080p' | '720p' | '480p',
 *     codec: 'h264' | 'vp9',
 *     burnCaptions: boolean,
 *     exportSubtitles: boolean
 *   },
 *   edits: {
 *     scenes: [{id, start, end, order}],
 *     captions: [{id, start, end, text}],
 *     overlays: [{type, start, end, ...}]
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { projectId, outputOptions, edits } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Load project
    const projectPath = join(uploadDir, `${projectId}.json`);
    if (!await fs.pathExists(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = await fs.readJSON(projectPath);
    const sourcePath = join(uploadDir, project.filePath);

    if (!await fs.pathExists(sourcePath)) {
      return res.status(404).json({ error: 'Source file not found' });
    }

    // Render video
    const exportFileName = await renderVideo(
      sourcePath,
      projectId,
      project,
      edits || {},
      outputOptions || {
        resolution: '1080p',
        codec: 'h264',
        burnCaptions: true,
        exportSubtitles: false
      }
    );

    const exportUrl = `/exports/${exportFileName}`;

    res.json({
      success: true,
      exportUrl,
      fileName: exportFileName
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Failed to export video', 
      message: error.message 
    });
  }
});

export default router;

