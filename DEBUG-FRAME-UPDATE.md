# 🔍 DEBUG GUIDE: Scene Frame Update Issue

## Problem
After replacing a scene with stock media, the preview shows the new video but the timeline still shows old frames.

## What We Added

### 🖥️ Frontend Debugging (SceneTrack.jsx)
Enhanced console logs to show:
- Total frames available in project
- Sample frame paths (first 3)
- For each scene:
  - Scene ID, index, start/end times
  - Number of frames found
  - First and last frame paths

### 🔧 Backend Debugging (stockMedia.js)
Added verification logs after saving:
- Total frames in updated project
- Frames count for replaced scene
- Re-reads saved file to verify persistence

## 🧪 Testing Steps

### 1. Open Browser Console
1. Open http://localhost:3000
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. Keep it open during testing

### 2. Load a Project
- Upload a video or open existing project
- Check console for initial frame logs:
  ```
  SceneTrack - Total frames available: 45
  SceneTrack - Scenes: 3
  SceneTrack - Sample frame paths: ["/uploads/frames/...", ...]
  Scene scene-0 (0): 0s-6.83s, Frames: 14
    First frame path: /uploads/frames/...
    Last frame path: /uploads/frames/...
  ```

### 3. Replace a Scene
1. **Click on a scene** on the timeline
2. **Click "Stock Media"** button
3. **Choose a video** from the modal
4. **Click "Use this video"**

### 4. Watch Backend Logs
Open a new terminal and run:
```bash
docker logs -f dscript-backend
```

You should see:
```
Clearing old frames in ...
Regenerating frames for scene scene-0 (0s-6.83s)
Generated 14 frames for scene scene-0
Generated 14 new frames for scene scene-0
Sample new frame path: /uploads/frames/{projectId}/{sceneId}/frame-0001.jpg
Frames before: 45, after: 45, removed: 14, added: 14
✅ Project saved with updated frames
   Total frames in project: 45
   Frames for scene scene-0: 14
   Verified saved project has 45 frames
```

### 5. After Page Reload
The page should reload automatically. Check console again:
```
SceneTrack - Total frames available: 45
SceneTrack - Sample frame paths: ["/uploads/frames/{projectId}/{sceneId}/frame-0001.jpg", ...]
Scene scene-0 (0): 0s-6.83s, Frames: 14
  First frame path: /uploads/frames/{projectId}/{sceneId}/frame-0001.jpg
  Last frame path: /uploads/frames/{projectId}/{sceneId}/frame-0014.jpg
```

## 🔎 What To Look For

### ✅ EXPECTED (Working)
- Frame paths include `{sceneId}` folder: `/uploads/frames/{projectId}/{sceneId}/frame-XXXX.jpg`
- Timeline shows NEW scene footage
- Console shows correct frame count for replaced scene

### ❌ UNEXPECTED (Bug)
- Frame paths are OLD: `/uploads/frames/{projectId}/frame-XXXX.jpg` (no sceneId)
- Timeline shows OLD scene footage despite preview being correct
- Console shows 0 frames for replaced scene

## 📊 Specific Things to Check

1. **Before replacement:**
   - Note the first frame path for Scene 1
   - Example: `/uploads/frames/abc-123/frame-0001.jpg`

2. **After replacement (backend logs):**
   - Should show: "Clearing old frames in .../frames/abc-123/scene-0"
   - Should show: "Sample new frame path: /uploads/frames/abc-123/scene-0/frame-0001.jpg"
   - Note the **scene-0** folder in the path

3. **After reload (frontend console):**
   - Check if `SceneTrack - Sample frame paths:` shows paths with `scene-0` folder
   - Check if the specific replaced scene shows new paths with `scene-0` folder

## 🐛 If Still Not Working

### Check 1: Are new frames generated?
```bash
# List frames for a specific scene
docker exec dscript-backend ls -la /app/uploads/frames/{projectId}/{sceneId}/

# Should show: frame-0001.jpg, frame-0002.jpg, etc.
```

### Check 2: Is project JSON updated?
```bash
# View project JSON
docker exec dscript-backend cat /app/uploads/{projectId}.json | grep -A 5 "frames"

# Should show frame paths with sceneId folder
```

### Check 3: Is frontend loading correct data?
- In browser console, type: `useEditorStore.getState().project.frames`
- Check if paths have sceneId folder

## 📋 Report Format

Please provide the following:

1. **Backend logs** (during replacement)
2. **Frontend console logs** (before and after reload)
3. **Screenshots** of:
   - Timeline before replacement
   - Timeline after replacement
   - Browser console output

This will help us pinpoint exactly where the issue is occurring.

---

## 🚀 Quick Test Command

Run this to see everything at once:
```bash
# Terminal 1: Backend logs
docker logs -f dscript-backend

# Terminal 2: Check frames folder
watch -n 2 "docker exec dscript-backend find /app/uploads/frames -type f | head -20"
```

Then perform the scene replacement and watch the logs in real-time.

