# Testing the Filmstrip Timeline

## 🎯 What You Should See

After uploading a video, you should see **multiple frames** displayed horizontally for each scene on the timeline, creating a filmstrip effect like in Descript.

## 🔍 Current Behavior

### If You See Multiple Frames ✅
- Each scene shows 3-20 frames horizontally
- Frames are separated by thin dark borders
- Scene has a filmstrip appearance
- **This is CORRECT!**

### If You See Only ONE Thumbnail Per Scene ❌
This means one of two things:

1. **You're viewing an OLD project** (uploaded before the update)
   - Old projects have frames extracted at 2-second intervals
   - Not enough frames to create filmstrip effect
   - **SOLUTION: Upload a NEW video**

2. **Frames weren't extracted properly**
   - Check backend console for errors
   - Verify FFmpeg is working
   - **SOLUTION: See troubleshooting below**

## 🧪 How to Test

### Step 1: Upload a NEW Video

**Important:** You MUST upload a new video after the code changes. Old projects won't have the dense frame extraction.

```bash
# 1. Make sure both servers are running
cd backend && npm run dev
# In another terminal:
cd frontend && npm run dev

# 2. Open browser: http://localhost:3000

# 3. Upload a NEW video (any MP4, MOV, etc.)
#    - Use the upload button in the UI
#    - Wait for processing to complete
```

### Step 2: Check the Console

Open browser DevTools (F12) and look at the console. You should see:

```
SceneTrack - Total frames available: 120  // <-- This number should be HIGH
SceneTrack - Scenes: 2
Scene scene-0: 0s-5.2s, Frames: 10        // <-- Each scene should have MULTIPLE frames
Scene scene-1: 5.2s-10.4s, Frames: 10
```

**Good signs:**
- ✅ Total frames > 50 (for a 30-second video)
- ✅ Each scene shows multiple frames (e.g., "Frames: 10")
- ✅ Frames are evenly distributed

**Bad signs:**
- ❌ Total frames available: 0
- ❌ Each scene shows "Frames: 0" or "Frames: 1"
- ❌ Very few frames for video length

### Step 3: Visual Check on Timeline

Look at the timeline (bottom of the screen):

**What you SHOULD see:**
```
┌────────────────────────────────────────┐
│ Scene 1                                │
│ [img][img][img][img][img][img][img]... │ <- Multiple frame thumbnails
│                                        │
└────────────────────────────────────────┘
```

**What you might see (OLD projects):**
```
┌────────────────────────────────────────┐
│ Scene 1                                │
│ [  single large thumbnail image  ]    │ <- Only one image repeated
│                                        │
└────────────────────────────────────────┘
```

## 🛠️ Troubleshooting

### Problem 1: Frames Count is 0

**Check backend logs:**

```bash
cd backend
npm run dev

# Look for these messages:
# ✅ "Extracting 120 frames (every 0.5 seconds)..."
# ✅ "Frame extraction complete"
# ✅ "Extracted 120 frames successfully"

# ❌ If you see errors about FFmpeg
```

**Solution:**
1. Verify FFmpeg is installed:
   ```bash
   ffmpeg -version
   ```

2. Check frames folder:
   ```bash
   ls -la backend/uploads/frames/
   # You should see folders like: abc123-uuid/
   
   ls -la backend/uploads/frames/abc123-uuid/
   # You should see: frame-0001.jpg, frame-0002.jpg, etc.
   ```

### Problem 2: Old Project Shows Only Thumbnail

**This is EXPECTED behavior!** Old projects used 2-second intervals, so they don't have enough frames.

**Solution:**
1. Upload a NEW video
2. The new video will automatically use 0.5-second intervals
3. You'll see the full filmstrip effect

**OR if you want to update an old project:**

You would need to re-extract frames (this is advanced):
```bash
# This would require backend API endpoint to re-process frames
# Currently not implemented - easier to just upload new video
```

### Problem 3: Frames Exist But Not Showing

**Check browser console:**

```javascript
SceneTrack - Total frames available: 0  // <-- frames array is empty
```

This means the project JSON doesn't have frames data.

**Solution:**
1. Check `backend/uploads/{projectId}.json`
2. Look for `"frames": [...]` property
3. If missing, the project needs to be re-uploaded

**Quick fix (manual):**
```bash
# Open the project JSON file
nano backend/uploads/abc123-uuid.json

# Check if "frames" array exists:
{
  "id": "abc123-uuid",
  "frames": [  // <-- This should exist and have items
    {"time": 0.0, "path": "/uploads/frames/..."},
    {"time": 0.5, "path": "/uploads/frames/..."},
    ...
  ]
}
```

### Problem 4: Frames Load Slowly

**Expected:** Initial load might take 2-3 seconds for large videos.

**If too slow:**
1. Frames are high quality (120x68, quality 3)
2. Many frames for long videos
3. Browser is loading all images

**Optimization (future):**
- Implement lazy loading
- Load frames only in viewport
- Use lower quality for distant frames

## 📊 Expected Frame Counts

| Video Length | Expected Frames | Frames per Scene (avg) |
|--------------|----------------|------------------------|
| 10 seconds   | ~20 frames     | 4-6 frames            |
| 30 seconds   | ~60 frames     | 10-15 frames          |
| 1 minute     | ~120 frames    | 20-30 frames          |
| 5 minutes    | ~600 frames    | 50-100 frames         |

**Note:** Each frame represents 0.5 seconds of video.

## ✅ Success Checklist

- [ ] Uploaded a NEW video (not an old project)
- [ ] Backend logs show "Extracted X frames successfully"
- [ ] Console shows "Total frames available: X" where X > 0
- [ ] Console shows each scene has multiple frames (not 0 or 1)
- [ ] Timeline displays multiple frame thumbnails per scene
- [ ] Frames are separated by thin dark borders (filmstrip effect)
- [ ] Zooming in/out adjusts frame width properly
- [ ] Scene number badge is visible on first frame
- [ ] Scene selection highlights the entire filmstrip

## 🎥 Example: Good Timeline Display

```
Time Ruler: 0:00    0:01    0:02    0:03    0:04    0:05
           ┌────────────────────────────────────────────┐
Scene 1:   │[1][▓][▓][▓][▓][▓][▓][▓][▓][▓][▓][▓]       │
           └────────────────────────────────────────────┘
           ┌────────────────────────────────────────────┐
Scene 2:   │[2][▓][▓][▓][▓][▓][▓][▓][▓][▓][▓][▓][▓][▓] │
           └────────────────────────────────────────────┘

[1], [2] = Scene number badges
[▓] = Individual video frames (thumbnails)
```

## 🆘 Still Having Issues?

1. **Check these files exist:**
   - `backend/services/ffmpeg.js` - Updated to 0.5s intervals
   - `frontend/src/components/SceneTrack.jsx` - Updated filmstrip rendering
   - `frontend/src/components/TimeRuler.jsx` - New time ruler component

2. **Clear everything and start fresh:**
   ```bash
   # Stop servers
   # Delete old project data
   rm -rf backend/uploads/*
   
   # Restart servers
   cd backend && npm run dev
   cd frontend && npm run dev
   
   # Upload a completely new video
   ```

3. **Check the browser console for errors**
   - Look for image loading errors
   - Look for path issues
   - Look for React errors

4. **Share console output:**
   ```
   SceneTrack - Total frames available: X
   SceneTrack - Scenes: Y
   Scene scene-0: Xs-Ys, Frames: Z
   ```

---

**Last Updated:** November 15, 2025
**Status:** 🟢 Active

