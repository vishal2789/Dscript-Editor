import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import fs from 'fs-extra';
import { transcribeAudio } from '../services/openai.js';
import { detectScenes, generateThumbnails, extractVideoFrames } from '../services/ffmpeg.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure upload directories exist
const uploadDir = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
const thumbnailsDir = join(uploadDir, 'thumbnails');
fs.ensureDirSync(uploadDir);
fs.ensureDirSync(thumbnailsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|mkv|webm|mp3|wav|m4a/;
    const ext = extname(file.originalname).toLowerCase().substring(1);
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video and audio files are allowed.'));
    }
  }
});

/**
 * POST /api/upload
 * Upload video/audio file and process:
 * - Scene detection
 * - Transcription with timestamps
 * - Speaker diarization (if available)
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadId = uuidv4();
    const filePath = req.file.path;
    const fileName = req.file.filename;

    console.log(`Processing upload ${uploadId} for file ${fileName}`);

    // Process in parallel where possible
    const [scenes, transcription] = await Promise.all([
      detectScenes(filePath, uploadId),
      transcribeAudio(filePath)
    ]);

    // Generate thumbnails for scenes and extract video frames every 2 seconds
    const [thumbnails, frames] = await Promise.all([
      generateThumbnails(filePath, uploadId, scenes),
      extractVideoFrames(filePath, uploadId, transcription.duration || 0)
    ]);

    // Map transcription segments to include scene context
    const transcriptionSegments = transcription.segments.map((seg, idx) => ({
      id: `seg-${idx}`,
      start: seg.start,
      end: seg.end,
      speaker: seg.speaker || null,
      text: seg.text
    }));

    // Create project data structure
    const projectData = {
      id: uploadId,
      fileName: req.file.originalname,
      filePath: fileName,
      duration: transcription.duration || 0,
      scenes: scenes.map((scene, idx) => ({
        id: `scene-${idx}`,
        start: scene.start,
        end: scene.end,
        thumbnailPath: thumbnails[idx] || null
      })),
      frames: frames, // Add frames array
      transcriptionSegments,
      fullTranscript: transcription.text,
      createdAt: new Date().toISOString()
    };

    // Save project data
    const projectPath = join(uploadDir, `${uploadId}.json`);
    await fs.writeJSON(projectPath, projectData, { spaces: 2 });

    res.json({
      uploadId,
      ...projectData
    });
  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Unknown error';
    if (error.message?.includes('API key')) {
      errorMessage = 'OpenAI API key is missing or invalid. Please check your .env file.';
    } else if (error.message?.includes('FFmpeg') || error.message?.includes('ffmpeg')) {
      errorMessage = 'FFmpeg is not installed or not found in PATH. Please install FFmpeg.';
    } else if (error.message?.includes('File')) {
      errorMessage = 'File processing error. Please ensure the file is a valid video/audio format.';
    }
    
    res.status(500).json({ 
      error: 'Failed to process upload', 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

