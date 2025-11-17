# Project Structure Reference

## Project JSON Format

When a video is uploaded and processed, the backend creates a project JSON file with the following structure:

```json
{
  "id": "uuid-v4",
  "fileName": "example-video.mp4",
  "filePath": "uuid-filename.mp4",
  "duration": 120.5,
  "scenes": [
    {
      "id": "scene-0",
      "start": 0,
      "end": 45.2,
      "thumbnailPath": "/uploads/thumbnails/uuid-scene-0.jpg",
      "order": 0
    },
    {
      "id": "scene-1",
      "start": 45.2,
      "end": 89.7,
      "thumbnailPath": "/uploads/thumbnails/uuid-scene-1.jpg",
      "order": 1
    }
  ],
  "transcriptionSegments": [
    {
      "id": "seg-0",
      "start": 0.5,
      "end": 5.2,
      "speaker": "A",
      "text": "Hello, welcome to this video tutorial."
    },
    {
      "id": "seg-1",
      "start": 5.2,
      "end": 12.8,
      "speaker": "B",
      "text": "Thank you for having me. I'm excited to share this with you."
    }
  ],
  "fullTranscript": "Hello, welcome to this video tutorial. Thank you for having me...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z"
}
```

## Field Descriptions

### Top Level
- `id`: Unique project identifier (UUID)
- `fileName`: Original uploaded filename
- `filePath`: Stored filename on server
- `duration`: Total video/audio duration in seconds
- `createdAt`: ISO timestamp of creation
- `updatedAt`: ISO timestamp of last update

### Scenes
- `id`: Unique scene identifier
- `start`: Start time in seconds
- `end`: End time in seconds
- `thumbnailPath`: URL path to thumbnail image
- `order`: Display/render order (for reordering)

### Transcription Segments
- `id`: Unique segment identifier
- `start`: Start time in seconds
- `end`: End time in seconds
- `speaker`: Speaker identifier (A, B, C, etc.) or null
- `text`: Transcribed text content

## Export Request Format

When exporting, send this structure:

```json
{
  "projectId": "uuid-v4",
  "outputOptions": {
    "resolution": "1080p",
    "codec": "h264",
    "burnCaptions": true,
    "exportSubtitles": true
  },
  "edits": {
    "scenes": [
      {
        "id": "scene-0",
        "start": 0,
        "end": 45.2,
        "order": 0
      }
    ],
    "captions": [
      {
        "id": "seg-0",
        "start": 0.5,
        "end": 5.2,
        "text": "Edited caption text"
      }
    ],
    "overlays": []
  }
}
```

## File Storage Structure

```
backend/
├── uploads/
│   ├── {uuid}.mp4          # Original uploaded file
│   ├── {uuid}.json         # Project data
│   └── thumbnails/
│       ├── {uuid}-scene-0.jpg
│       └── {uuid}-scene-1.jpg
└── exports/
    ├── {uuid}-{timestamp}.mp4
    └── {uuid}-subtitles.srt
```

