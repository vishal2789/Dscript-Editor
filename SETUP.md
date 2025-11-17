# Quick Setup Guide

## 1. Install Dependencies

**Important: Run this from the project root directory**

```bash
npm run install:all
```

This installs dependencies for:
- Root (concurrently for dev scripts)
- Backend (Express, OpenAI, FFmpeg, etc.)
- Frontend (React, Vite, Tailwind, etc.)

**Note:** The script automatically changes directories, so you don't need to `cd` into each folder manually.

## 2. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH.

Verify installation:
```bash
ffmpeg -version
```

## 3. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
OPENAI_API_KEY=sk-your-key-here
PORT=3001
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports
NODE_ENV=development
```

## 4. Create Directories

```bash
mkdir -p backend/uploads backend/exports backend/uploads/thumbnails
```

## 5. Run Development Server

**Run from project root:**

```bash
npm run dev
```

This starts:
- Backend on http://localhost:3001
- Frontend on http://localhost:3000

**Note:** If you want to run them separately:
- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`

## 6. Test the Application

1. Open http://localhost:3000
2. Upload a video or audio file
3. Wait for processing (transcription + scene detection)
4. Edit the transcript and see it sync with the timeline
5. Click "Improve Captions" to test AI improvement
6. Export the video

## Troubleshooting

### "File is not defined" error
- Ensure Node.js 18+ is installed: `node --version`
- The File API is available in Node.js 18+ as a global

### FFmpeg not found
- Verify FFmpeg is in PATH: `which ffmpeg` (macOS/Linux)
- On Windows, ensure FFmpeg is in your system PATH

### OpenAI API errors
- Verify your API key is correct
- Check you have credits/usage available
- Ensure the file format is supported (mp4, mp3, wav, etc.)

### CORS errors
- Ensure backend is running on port 3001
- Check frontend proxy configuration in `frontend/vite.config.js`

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check API endpoints in the README
- Customize export options and UI styling

