import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import uploadRoutes from './routes/upload.js';
import projectRoutes from './routes/project.js';
import exportRoutes from './routes/export.js';
import captionRoutes from './routes/captions.js';
import stockMediaRoutes from './routes/stockMedia.js';
import scenesRoutes from './routes/scenes.js';
import backgroundRoutes from './routes/background.js';

// Load .env file from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Verify API keys are loaded
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  Warning: OPENAI_API_KEY not set. Transcription and caption improvement will not work.');
  console.warn('   Make sure .env file exists in backend/ directory with OPENAI_API_KEY=your_key');
} else {
  console.log('✅ OpenAI API key loaded');
}

if (!process.env.PEXELS_API_KEY) {
  console.warn('⚠️  Warning: PEXELS_API_KEY not set. Stock media feature will not work.');
  console.warn('   Get a free key at https://www.pexels.com/api/ and add to .env file');
} else {
  console.log('✅ Pexels API key loaded');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(join(__dirname, 'uploads')));
app.use('/exports', express.static(join(__dirname, 'exports')));
// Serve frames directory
app.use('/uploads/frames', express.static(join(__dirname, 'uploads/frames')));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/captions', captionRoutes);
app.use('/api/stock-media', stockMediaRoutes);
app.use('/api/scenes', scenesRoutes);
app.use('/api/background', backgroundRoutes);

// Health check
app.get('/api/health', (req, res) => {
  let ffmpegAvailable = false;
  let ffmpegVersion = null;
  
  try {
    const version = execSync('ffmpeg -version', { encoding: 'utf8', timeout: 5000 });
    ffmpegAvailable = true;
    ffmpegVersion = version.split('\n')[0];
  } catch (err) {
    ffmpegAvailable = false;
  }
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    ffmpegAvailable,
    ffmpegVersion,
    nodeVersion: process.version,
    fileApiAvailable: typeof File !== 'undefined'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

