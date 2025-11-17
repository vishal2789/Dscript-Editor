# Dscript Editor

A production-ready, transcript-first video editor inspired by Descript. Edit video by editing text, with automatic transcription, scene detection, speaker diarization, and AI-powered caption improvement.

## Features

- 🎬 **Transcript-First Editing**: Edit video by editing text. Changes to the transcript automatically update the timeline and export.
- 🎵 **Waveform Timeline**: Visual waveform with synchronized text segments and scene thumbnails.
- 🎞️ **Scene Detection**: Automatic scene splitting with thumbnail generation.
- 🎤 **Speaker Diarization**: Identify and tag different speakers in the audio.
- ✏️ **Editable Captions**: Auto-generated captions that can be edited inline. Double-click to edit.
- ✨ **AI Caption Improvement**: Use OpenAI GPT to improve grammar, make text more concise, or change tone.
- 🎨 **Real-time Preview**: Instant preview with HTML5 video and canvas overlays.
- 📤 **Export Options**: Export with burned-in captions or separate SRT files, multiple resolutions and codecs.
- ↩️ **Undo/Redo**: Full history support with undo/redo functionality.
- 💾 **Project Save/Load**: Save and load projects with all edits preserved.

## Tech Stack

### Frontend
- React 18 + Vite
- TailwindCSS
- Zustand (state management)
- React Player (video playback)
- WaveSurfer.js (waveform visualization)
- Konva (canvas overlays)

### Backend
- Node.js + Express
- OpenAI API (transcription & GPT)
- FFmpeg (scene detection, rendering)
- Multer (file uploads)

## Prerequisites

- Node.js 18+ and npm
- FFmpeg installed on your system
- OpenAI API key

### Installing FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dscript_editor
```

2. Install dependencies (run from project root):
```bash
npm run install:all
```

This installs dependencies for root, backend, and frontend automatically.

3. Set up environment variables:
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports
NODE_ENV=development
```

4. Create necessary directories (from project root):
```bash
mkdir -p backend/uploads backend/exports backend/uploads/thumbnails
```

## Running the Application

### Development Mode

Run both frontend and backend concurrently (from project root):
```bash
npm run dev
```

Or run separately:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Production Build

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`.

## Usage

1. **Upload Video/Audio**: 
   - Go to the home page
   - Drag and drop or click to upload a video/audio file
   - Wait for processing (transcription and scene detection)

2. **Edit Transcript**:
   - Click on any text segment to jump to that moment in the video
   - Double-click text to edit inline
   - Changes automatically update the timeline

3. **Improve Captions**:
   - Click "✨ Improve Captions" in the toolbar
   - AI will improve grammar and clarity

4. **Export**:
   - Click "📤 Export" in the toolbar
   - Choose export options (resolution, codec, captions)
   - Download the rendered video

## Keyboard Shortcuts

- `Space`: Play/Pause
- `J`: Rewind 10 seconds
- `L`: Fast forward 10 seconds
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z`: Redo

## API Endpoints

### POST `/api/upload`
Upload video/audio file. Returns project data with transcription and scenes.

**Request:**
- `file`: Multipart form file

**Response:**
```json
{
  "uploadId": "uuid",
  "scenes": [...],
  "transcriptionSegments": [...],
  "fullTranscript": "..."
}
```

### GET `/api/project/:id`
Load saved project.

### PUT `/api/project/:id`
Save/update project.

### POST `/api/captions/improve`
Improve captions using AI.

**Request:**
```json
{
  "captions": "text or array",
  "style": "grammar|concise|professional|casual"
}
```

### POST `/api/export`
Export video with edits.

**Request:**
```json
{
  "projectId": "uuid",
  "outputOptions": {
    "resolution": "1080p|720p|480p",
    "codec": "h264|vp9",
    "burnCaptions": true,
    "exportSubtitles": true
  },
  "edits": {
    "scenes": [...],
    "captions": [...]
  }
}
```

## Project Structure

```
dscript_editor/
├── backend/
│   ├── routes/          # API routes
│   ├── services/        # Business logic (FFmpeg, OpenAI)
│   ├── uploads/         # Uploaded files
│   ├── exports/         # Exported videos
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── store/       # Zustand store
│   │   └── App.jsx      # Main app
│   └── package.json
└── README.md
```

## Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 3001)
- `OPENAI_API_KEY`: OpenAI API key (required)
- `UPLOAD_DIR`: Directory for uploads (default: ./uploads)
- `EXPORT_DIR`: Directory for exports (default: ./exports)
- `NODE_ENV`: Environment (development/production)

## Rate Limits & Costs

- **OpenAI Transcription**: ~$0.006 per minute (Whisper API)
- **OpenAI GPT**: ~$0.15 per 1M input tokens (GPT-4o-mini)
- Consider implementing rate limiting for production use
- Use job queues (Bull/Bee) for heavy tasks in production

## Deployment

### Backend
1. Set environment variables on your hosting platform
2. Ensure FFmpeg is installed on the server
3. Use a process manager like PM2:
```bash
pm2 start backend/server.js --name dscript-backend
```

### Frontend
1. Build the frontend: `cd frontend && npm run build`
2. Serve `frontend/dist/` with a static file server (Nginx, Vercel, Netlify)
3. Configure proxy to backend API

### Storage
- For production, use S3-compatible storage
- Update upload/export paths to use S3 adapters
- Consider using `multer-s3` for direct S3 uploads

## Troubleshooting

### FFmpeg not found
- Ensure FFmpeg is installed and in PATH
- On some systems, you may need to specify FFmpeg path in code

### Transcription fails
- Check OpenAI API key is set correctly
- Verify file format is supported
- Check API rate limits
- If you get "File is not defined" error, ensure you're using Node.js 18+ or install a File polyfill

### Waveform not loading
- Ensure CORS is configured correctly
- Check that audio/video file is accessible
- Verify WaveSurfer.js is loading correctly

## Future Enhancements

- [ ] Voice cloning/overdub (with proper consent)
- [ ] Multi-track audio editing
- [ ] Advanced transitions and effects
- [ ] Cloud storage integration (S3)
- [ ] Collaborative editing
- [ ] Real-time collaboration
- [ ] Mobile app support

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

