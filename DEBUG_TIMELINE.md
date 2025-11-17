# Debug Timeline Frames Issue

## 🔍 What to Check

### 1. Open Browser Console (F12)

After loading a project in the editor, you should see these console logs:

```javascript
SceneTrack - Total frames available: X    // ← Should be > 0
SceneTrack - Scenes: Y                     // ← Number of scenes
Scene scene-0: 0s-5.2s, Frames: Z         // ← Each scene frame count
Rendering N placeholder frames for scene scene-0 (duration: 5.2s)
```

**What to look for:**

✅ **GOOD:**
```
SceneTrack - Total frames available: 120
SceneTrack - Scenes: 2
Scene scene-0: 0s-5.2s, Frames: 10
Rendering 10 real frames for scene scene-0
```

❌ **BAD:**
```
SceneTrack - Total frames available: 0
SceneTrack - Scenes: 2
Scene scene-0: 0s-5.2s, Frames: 0
Rendering 10 placeholder frames for scene scene-0 (duration: 5.2s)
```

---

## 2. Check Frame Width Calculation

In the console, you should see the frame width being calculated:

```javascript
// Each frame should be at least 60px wide
frameWidth = timeToPixels(0.5, 100) = 50px
displayWidth = Math.max(50, 60) = 60px
```

If frames are too small, you won't see multiple frames - they'll look like one thumbnail.

---

## 3. Visual Inspection

### What the scene container SHOULD look like:

```html
<div class="absolute flex" style="width: 520px">  <!-- Scene container -->
  <div style="width: 60px">                       <!-- Frame 1 -->
    <img src="/uploads/frames/.../frame-0001.jpg" />
  </div>
  <div style="width: 60px" class="border-r">     <!-- Frame 2 -->
    <img src="/uploads/frames/.../frame-0002.jpg" />
  </div>
  <div style="width: 60px" class="border-r">     <!-- Frame 3 -->
    <img src="/uploads/frames/.../frame-0003.jpg" />
  </div>
  <!-- ... more frames ... -->
</div>
```

### What might be wrong:

❌ **Scene container using `flex` but frames not showing:**
- Check if `overflow: hidden` is hiding frames
- Check if scene width is too small
- Check if frame width is larger than scene width

❌ **Only one frame visible:**
- Frames might be stacked on top of each other (check z-index)
- Scene container might not have `display: flex`
- Frame divs might not have `flex-shrink-0`

---

## 4. Backend Frame Extraction Check

### Check if frames were extracted:

```bash
# Go to backend folder
cd backend

# Check frames directory
ls -la uploads/frames/

# You should see project folders like:
# drwxr-xr-x  120  abc123-uuid-xxxx/

# Check inside a project folder
ls -la uploads/frames/abc123-uuid-xxxx/

# You should see:
# -rw-r--r--  frame-0001.jpg
# -rw-r--r--  frame-0002.jpg
# -rw-r--r--  frame-0003.jpg
# ... (many files)
```

### Check backend logs when uploading:

```bash
cd backend
npm run dev

# When you upload a video, look for:
Extracting 120 frames (every 0.5 seconds)...
Frame extraction complete
Extracted 120 frames successfully
```

❌ **If you see errors:**
```
Frame extraction error: ...
FFmpeg not found
```

**Solution:** Install FFmpeg
```bash
brew install ffmpeg  # macOS
```

---

## 5. Project JSON Check

### Check if frames are in project data:

```bash
# Open a project JSON file
cd backend/uploads
cat abc123-uuid.json | grep -A 5 "frames"

# You should see:
"frames": [
  {
    "time": 0,
    "path": "/uploads/frames/abc123-uuid/frame-0001.jpg"
  },
  {
    "time": 0.5,
    "path": "/uploads/frames/abc123-uuid/frame-0002.jpg"
  },
  ...
]
```

❌ **If frames array is empty or missing:**
- Re-upload the video
- Check backend logs for errors
- Verify FFmpeg is working

---

## 6. Network Tab Check

### Open Browser DevTools → Network Tab

When timeline loads, you should see:

```
GET /uploads/frames/abc123-uuid/frame-0001.jpg  200 OK
GET /uploads/frames/abc123-uuid/frame-0002.jpg  200 OK
GET /uploads/frames/abc123-uuid/frame-0003.jpg  200 OK
... (multiple frame requests)
```

❌ **If you see 404 errors:**
- Frames weren't extracted
- Frame paths are wrong
- Backend server not serving files correctly

---

## 7. React DevTools Check

### Install React DevTools extension

Inspect the `SceneTrack` component:

```javascript
Props:
  - (no props, uses store)

State:
  - stockModalOpen: false
  - selectedSceneForStock: null
  - replacing: false

Store Values:
  - scenes: Array(2)
    - [0]: {id: "scene-0", start: 0, end: 5.2, ...}
    - [1]: {id: "scene-1", start: 5.2, end: 10.4, ...}
  - project.frames: Array(120)  // ← Should have items!
    - [0]: {time: 0, path: "/uploads/frames/..."}
    - [1]: {time: 0.5, path: "/uploads/frames/..."}
    ...
```

---

## 8. CSS/Layout Check

### Inspect scene container element:

```css
.absolute.flex {
  display: flex;           /* ✓ Must be flex */
  position: absolute;      /* ✓ For positioning */
  left: 0px;              /* Scene start position */
  width: 520px;           /* Scene duration × zoom */
  height: 68px;
  overflow: hidden;        /* ✓ Good */
}
```

### Inspect frame elements:

```css
.relative.flex-shrink-0 {
  display: block;          /* ✓ or flex */
  flex-shrink: 0;         /* ✓ Prevents compression */
  width: 60px;            /* Frame width */
  height: 68px;
  border-right: 1px solid #374151;
}
```

---

## 9. Quick Fixes to Try

### Fix 1: Hard-code frame count for testing

In `SceneTrack.jsx`, temporarily replace the logic:

```javascript
// TEMPORARY TEST: Always show 10 frames
const displayFrameCount = 10;

return Array.from({ length: displayFrameCount }, (_, frameIdx) => (
  <div
    key={`test-${frameIdx}`}
    className="relative flex-shrink-0 border-r border-gray-700 bg-red-500"
    style={{ width: '60px', height: '68px' }}
  >
    <span className="text-white">{frameIdx + 1}</span>
  </div>
));
```

**Expected result:** You should see 10 red boxes numbered 1-10

If you DON'T see them, the issue is with the container layout.

### Fix 2: Check if scene width is too small

Add this to console:

```javascript
console.log('Scene width:', scene.width, 'Frame width:', frameWidth);
```

If `scene.width < frameWidth`, you'll only see 1 frame.

**Solution:** Increase zoom level:
```javascript
// In TimelineControls, click Zoom In (+) button several times
```

### Fix 3: Force scene container to be wider

```javascript
style={{
  left: `${scene.left}px`,
  width: `${Math.max(scene.width, 600)}px`, // Force minimum 600px
  height: '68px',
}}
```

---

## 10. Complete Test Scenario

1. **Fresh Upload:**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   
   # Browser: http://localhost:3000
   ```

2. **Upload new 10-second video**

3. **Wait for processing (watch backend logs)**

4. **Open console IMMEDIATELY**

5. **Look for these messages:**
   ```
   SceneTrack - Total frames available: 20
   Scene scene-0: 0s-10s, Frames: 20
   Rendering 20 real frames for scene scene-0
   ```

6. **Inspect timeline visually:**
   - Do you see multiple small images side-by-side?
   - Or one large image?

7. **Inspect DOM:**
   - Right-click scene → Inspect
   - Check if multiple `<div>` elements exist
   - Check if they have proper widths

8. **Zoom In/Out:**
   - Click zoom buttons
   - Do frames resize?
   - Do you see more/fewer frames?

---

## 11. Expected Console Output (GOOD)

```
SceneTrack - Total frames available: 40
SceneTrack - Scenes: 2
Scene scene-0: 0s-10s, Frames: 20
Rendering 20 real frames for scene scene-0
Scene scene-1: 10s-20s, Frames: 20
Rendering 20 real frames for scene scene-1
```

Then in Network tab:
```
GET http://localhost:3001/uploads/frames/abc123-uuid/frame-0001.jpg 200
GET http://localhost:3001/uploads/frames/abc123-uuid/frame-0002.jpg 200
GET http://localhost:3001/uploads/frames/abc123-uuid/frame-0003.jpg 200
... (40 total requests)
```

---

## 12. Share This Info

If frames still aren't showing, share:

1. **Console output:**
   ```
   SceneTrack - Total frames available: X
   Scene scene-0: Xs-Ys, Frames: Z
   ```

2. **Screenshot of timeline**

3. **Screenshot of browser DevTools → Elements tab** (inspecting scene div)

4. **Backend logs** when uploading video

5. **Project JSON frames array** (first 3 items)

---

**Last Updated:** November 15, 2025

