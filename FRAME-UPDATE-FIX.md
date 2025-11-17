# 🎯 Scene Frame Update - Enhanced Debugging

## What's Changed

I've added comprehensive debugging logs to trace exactly what's happening when you replace a scene with stock media and the frames don't update on the timeline.

### 🔧 Changes Made

1. **Frontend (SceneTrack.jsx):**
   - Added detailed console logs showing:
     - Total frames loaded
     - Sample frame paths
     - Per-scene frame counts and paths
     - First and last frame path for each scene

2. **Backend (stockMedia.js):**
   - Added verification logs after saving project:
     - Total frames count
     - Scene-specific frame count
     - Re-reads file to verify save was successful

## 🧪 How to Test

### Step 1: Open Browser Console
1. Go to http://localhost:3000
2. Press F12 (or Cmd+Option+I on Mac)
3. Click **Console** tab
4. Keep it open

### Step 2: Open Backend Logs Terminal
```bash
docker logs -f dscript-backend
```

### Step 3: Test Scene Replacement
1. **Select a scene** on the timeline
2. **Click "Stock Media"** button
3. **Choose a video** from the modal
4. **Click "Use this video"**
5. **Watch the logs** in both browser console and backend terminal

### Step 4: After Page Reload
- Check browser console for new frame paths
- Timeline should show NEW scene frames

## 📊 What You'll See

### Before Replacement (Browser Console):
```
SceneTrack - Total frames available: 45
SceneTrack - Scenes: 3
SceneTrack - Sample frame paths: ["/uploads/frames/abc-123/frame-0001.jpg", ...]
Scene scene-0 (0): 0s-6.83s, Frames: 14
  First frame path: /uploads/frames/abc-123/frame-0001.jpg
```

### During Replacement (Backend Terminal):
```
Clearing old frames in /app/uploads/frames/abc-123/scene-0
Regenerating frames for scene scene-0 (0s-6.83s)
Generated 14 frames for scene scene-0
✅ Project saved with updated frames
   Total frames in project: 45
   Frames for scene scene-0: 14
   Verified saved project has 45 frames
```

### After Reload (Browser Console):
```
SceneTrack - Total frames available: 45
SceneTrack - Sample frame paths: ["/uploads/frames/abc-123/scene-0/frame-0001.jpg", ...]
Scene scene-0 (0): 0s-6.83s, Frames: 14
  First frame path: /uploads/frames/abc-123/scene-0/frame-0001.jpg
                                              ^^^^^^^^
                    ⬆️ NEW: Scene-specific folder
```

## 🔍 Key Things to Check

### ✅ Expected Behavior:
- Frame paths should have **scene-specific folder**: `/uploads/frames/{projectId}/{sceneId}/frame-XXXX.jpg`
- Timeline shows NEW scene footage (not old)
- Console logs show correct frame counts

### ❌ If Still Broken:
- Frame paths are OLD: `/uploads/frames/{projectId}/frame-XXXX.jpg` (no sceneId folder)
- Timeline shows OLD footage despite preview being correct
- Console shows 0 frames for replaced scene

## 📝 What to Report

After testing, please provide:

1. **Backend logs** from the terminal (during replacement)
2. **Browser console logs** (before and after reload)
3. **Screenshot** of the timeline after reload
4. **Description**: What you see vs. what you expect

This will help me identify exactly where the issue is:
- Is the backend generating new frames? ✓
- Is the project JSON being saved correctly? ✓
- Is the frontend loading the correct data? ✓
- Are the frame paths correct? ?

## 🚀 Quick Test

1. **Open two terminals:**
   ```bash
   # Terminal 1: Backend logs
   docker logs -f dscript-backend
   ```

2. **Open browser with console (F12)**

3. **Replace a scene and watch:**
   - Backend terminal shows frame generation
   - Page reloads automatically
   - Browser console shows new frame paths
   - Timeline displays new scene frames ✅

---

## 💡 Expected Fix

Once we identify the issue from the logs, the fix will likely be one of:
- Ensuring frame paths are correctly saved with scene folders
- Forcing cache clear for images
- Correcting frame filtering logic
- Updating frame generation timing

**Let me know what you see in the logs!** 🔍

