# Stock Media Replacement Feature

## Overview
This feature allows you to replace any scene in your video with AI-suggested stock footage from Pexels. The system uses OpenAI Vision to analyze the scene and automatically finds similar stock videos.

## Features

### 1. **AI Scene Analysis** 🤖
- Uses OpenAI GPT-4 Vision to analyze scene thumbnails
- Extracts 3-5 keywords optimized for stock video search
- Identifies: main subject, activity, setting, mood, style

### 2. **Stock Video Search** 🔍
- Integration with Pexels API (free stock videos)
- Returns 15 HD videos matching the scene
- Shows preview thumbnails, duration, resolution

### 3. **Interactive Selection** 🎬
- Modal UI for browsing stock footage
- Live video preview before selection
- Shows video metadata (duration, resolution, creator)

### 4. **Seamless Replacement** ✂️
- Replaces scene using FFmpeg
- Maintains video quality and resolution
- Preserves audio and other scenes
- Updates live preview immediately

## Setup Instructions

### 1. Get Pexels API Key (Free!)

1. Go to https://www.pexels.com/api/
2. Click "Get Started"
3. Sign up (free account)
4. Get your API key from the dashboard

### 2. Update Backend Configuration

Edit `backend/.env` and add:

```bash
# Existing keys
OPENAI_API_KEY=sk-...

# Add Pexels API key
PEXELS_API_KEY=your_pexels_api_key_here
```

### 3. Restart Server

```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

## How to Use

### Step 1: Select a Scene

1. Upload and process a video
2. On the timeline, click any scene to select it
3. You'll see a **"Stock Media"** button appear in the top-right of the scene

### Step 2: Open Stock Media Modal

1. Click the **"Stock Media"** button
2. The modal opens automatically
3. AI automatically analyzes the scene and shows suggested videos

### Step 3: Browse & Preview

1. Browse through 15 suggested videos
2. Click any video to preview it
3. Video plays in the right preview panel
4. See metadata: duration, resolution, creator

### Step 4: Select & Replace

1. Click **"Replace Scene with This Video"**
2. Wait for processing (usually 30-60 seconds)
3. Video preview updates automatically
4. Scene is replaced seamlessly!

## User Interface

```
┌─────────────────────────────────────────────────────────┐
│  Choose Stock Footage                              [X]  │
│  Scene scene-0 • Duration: 5.2s                         │
├─────────────────────────────────────────────────────────┤
│  [Search: "woman running fitness..."] [Search] [AI]    │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│  📹 Stock Video Grid     │  ▶ Video Preview            │
│                          │                              │
│  [Thumb] [Thumb] [Thumb] │  [Playing selected video]   │
│  [Thumb] [Thumb] [Thumb] │                              │
│  [Thumb] [Thumb] [Thumb] │  Duration: 8s               │
│  [Thumb] [Thumb] [Thumb] │  Resolution: 1920x1080      │
│  [Thumb] [Thumb] [Thumb] │  By: John Doe               │
│                          │                              │
│                          │  [Replace Scene with This]  │
├──────────────────────────┴──────────────────────────────┤
│  Stock videos powered by Pexels                         │
└─────────────────────────────────────────────────────────┘
```

## Technical Details

### Backend APIs

#### 1. **POST /api/stock-media/analyze-scene**
Analyzes scene thumbnail with OpenAI Vision

**Request:**
```json
{
  "thumbnailPath": "/uploads/thumbnails/abc-123/thumb-0.jpg"
}
```

**Response:**
```json
{
  "keywords": "woman running, fitness, outdoor, morning, athletic",
  "videos": [
    {
      "id": 123456,
      "image": "https://...",
      "duration": 8,
      "width": 1920,
      "height": 1080,
      "user": {
        "name": "John Doe",
        "url": "https://..."
      },
      "videoFiles": [
        {
          "quality": "hd",
          "width": 1920,
          "height": 1080,
          "link": "https://player.vimeo.com/...",
          "fileType": "video/mp4"
        }
      ]
    }
  ]
}
```

#### 2. **POST /api/stock-media/search**
Searches stock videos with custom query

**Request:**
```json
{
  "query": "sunset beach waves",
  "perPage": 15
}
```

**Response:**
```json
{
  "query": "sunset beach waves",
  "videos": [...]
}
```

#### 3. **POST /api/stock-media/replace-scene**
Replaces scene with stock footage

**Request:**
```json
{
  "projectId": "abc-123",
  "sceneId": "scene-0",
  "stockVideoUrl": "https://player.vimeo.com/...",
  "sceneStart": 0,
  "sceneEnd": 5.2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scene replaced successfully",
  "videoPath": "edited-xyz-789.mp4",
  "videoUrl": "/uploads/edited-xyz-789.mp4"
}
```

### FFmpeg Process

1. **Extract before scene:** `0s → scene_start`
2. **Download stock video**
3. **Trim & scale stock video** to match scene duration and resolution
4. **Extract after scene:** `scene_end → end`
5. **Concatenate:** before + stock + after
6. **Output:** New edited video

### File Structure

```
backend/
├── services/
│   └── stockMedia.js         # Stock media logic
├── routes/
│   └── stockMedia.js          # API endpoints
└── uploads/
    └── stock/                 # Downloaded stock videos

frontend/
└── src/
    └── components/
        ├── SceneTrack.jsx     # Updated with stock button
        └── StockMediaModal.jsx # Stock selection UI
```

## Features in Action

### Workflow Example

```
1. User uploads "cooking tutorial.mp4"
   ↓
2. System detects 8 scenes
   ↓
3. User clicks Scene 3 (shows kitchen countertop)
   ↓
4. User clicks "Stock Media" button
   ↓
5. OpenAI Vision analyzes: "kitchen countertop cooking ingredients"
   ↓
6. Pexels returns 15 stock videos of kitchens
   ↓
7. User previews and selects professional kitchen shot
   ↓
8. FFmpeg replaces Scene 3 with stock video
   ↓
9. Updated video plays immediately
```

## API Limits

### OpenAI
- **Vision API:** ~$0.01 per image
- **Rate limit:** 500 requests/min (paid tier)

### Pexels
- **Free tier:** 200 requests/hour
- **No attribution required** (but appreciated)
- **Commercial use allowed**

## Error Handling

Common errors and solutions:

### "Invalid Pexels API key"
**Solution:** Check `PEXELS_API_KEY` in `.env` file

### "File too large"
**Solution:** Original video > 25MB triggers audio extraction first

### "FFmpeg not found"
**Solution:** Install FFmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
choco install ffmpeg
```

### "Scene replacement failed"
**Possible causes:**
- Video codecs incompatible
- Insufficient disk space
- Stock video download failed

**Solution:** Check backend logs for details

## Performance

- **Scene analysis:** ~2-3 seconds (OpenAI Vision)
- **Stock search:** ~1 second (Pexels API)
- **Video replacement:** ~30-60 seconds (depends on video length)
- **Total time:** ~1 minute per scene

## Future Enhancements

- [ ] Support for Pixabay, Unsplash Video
- [ ] Save favorite stock videos
- [ ] Batch scene replacement
- [ ] Custom stock video library
- [ ] Transition effects between scenes
- [ ] Color grading to match original
- [ ] Audio mixing options

## Credits

- **Stock videos:** [Pexels](https://www.pexels.com)
- **AI analysis:** [OpenAI GPT-4 Vision](https://openai.com)
- **Video processing:** [FFmpeg](https://ffmpeg.org)

## License

This feature is part of the Descript-style video editor and follows the same license.

---

**Need help?** Check backend logs or open an issue on GitHub.

