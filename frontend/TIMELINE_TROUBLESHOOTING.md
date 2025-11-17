# Timeline Troubleshooting Guide

## Issue: Words/Scenes Not Showing on Timeline

### Symptoms
- Timeline appears but no word blocks visible
- Scenes not rendering
- Only waveform and frames showing

### Root Causes & Solutions

#### 1. **Project Data Not Loaded**
**Check:**
- Browser Console → Look for errors
- Application state → Are `words` and `scenes` arrays populated?

**Solution:**
```javascript
// In browser console:
// Open Redux DevTools (if installed)
// Check store.project.scenes and store.project.words

// If empty, the upload might have failed:
// 1. Check backend logs for transcription errors
// 2. Verify OpenAI API key is set in .env
// 3. Ensure FFmpeg is installed
```

#### 2. **Words Array Empty But Segments Exist**
**Cause:** The store's `setProject` function should parse segments into words, but it might not be triggered.

**Fix:**
```javascript
// In useEditorStore.js setProject:
// Make sure segments → words conversion runs
// Check if transcriptionSegments exist:
if (project?.transcriptionSegments?.length > 0) {
  // Words should be generated here
}
```

#### 3. **Layout Issues - Tracks Not Visible**
**Check Timeline.jsx layout:**
```jsx
// Should have:
// 1. Waveform Track (h-16) ✅
// 2. Frames Strip (h-16) ✅
// 3. Timeline Content with flex flex-col ✅
// 4. SceneTrack wrapper with width ✅
// 5. WordTrack wrapper with width ✅
```

**Verify in DevTools:**
- Timeline element has correct height
- SceneTrack div has `h-24` height
- WordTrack div has `h-20` height
- Parent has `flex flex-col`

#### 4. **Zoom Level Issue - Blocks Too Small**
**Symptom:** Word/scene blocks very tiny or not visible

**Solution:**
```javascript
// Increase zoom level:
// Default: zoomLevel = 1 (1px per second)
// Try: zoomLevel = 50 (50px per second)

// In TimelineControls or programmatically:
setZoomLevel(50);

// Zoom should be between 0.1 and 10
```

#### 5. **Words Generated But Not Rendering**
**Check in WordTrack.jsx:**

```javascript
// Add temporary logging:
console.log('Words:', words.length);
console.log('Word blocks:', wordBlocks.length);

// If words exist but wordBlocks is empty:
// - Check if timeToPixels function works
// - Verify startTime/endTime are valid numbers
// - Check if zoomLevel is > 0
```

#### 6. **Scenes Not Rendering But Data Exists**
**Check in SceneTrack.jsx:**

```javascript
// Verify scenes structure:
// Each scene should have:
// - id: string
// - start: number (seconds)
// - end: number (seconds)
// - thumbnailPath: string (optional)

// If start/end are strings, they need conversion:
start: parseFloat(scene.start),
end: parseFloat(scene.end)
```

## Common Errors

### Error: "Cannot read property 'length' of undefined"
**Solution:**
- Check if `words` or `scenes` are null/undefined
- Add null checks before rendering:
```javascript
if (!words || words.length === 0) return null;
```

### Error: "timeToPixels is not a function"
**Solution:**
- Verify import: `import { timeToPixels } from '../utils/time'`
- Check time.js exports the function
- Ensure no circular imports

### Error: "playheadTime is undefined"
**Solution:**
- Make sure `setPlayheadTime` is called in useEditorStore
- Verify Playhead component receives playheadTime from store
- Check if store is properly initialized

### Console Warning: "Each child in a list should have a key prop"
**Solution:**
- Verify wordBlocks and scenesWithPixels have unique `key` props
- `key={word.id}` for words
- `key={scene.id}` for scenes

## Testing Checklist

- [ ] Upload a video file
- [ ] Wait for processing (transcription, scene detection, frame extraction)
- [ ] Verify backend returns `frames`, `scenes`, and `transcriptionSegments`
- [ ] Check store.project has all fields
- [ ] Check store.words array is populated
- [ ] Check store.scenes array is populated
- [ ] See SceneTrack rendering (h-24 gray box with blocks)
- [ ] See WordTrack rendering (h-20 white box with word blocks)
- [ ] Click a scene → video should seek
- [ ] Click a word → video should seek
- [ ] Play video → playhead should move
- [ ] Play video → active word should highlight blue
- [ ] Drag playhead → video should seek

## Debug Mode

Enable verbose logging:

```javascript
// At top of WordTrack.jsx:
const DEBUG = true;

// Then in render:
if (DEBUG && wordBlocks.length > 0) {
  console.log(`Rendering ${wordBlocks.length} words`);
  wordBlocks.slice(0, 3).forEach(w => {
    console.log(`- ${w.text} @ ${w.left}px, width ${w.width}px`);
  });
}

// At top of SceneTrack.jsx:
const DEBUG = true;

if (DEBUG && scenesWithPixels.length > 0) {
  console.log(`Rendering ${scenesWithPixels.length} scenes`);
  scenesWithPixels.slice(0, 3).forEach(s => {
    console.log(`- Scene @ ${s.left}px, width ${s.width}px`);
  });
}
```

## Performance Issues

### Slow Rendering
- Check if zoom level is too high (many blocks)
- Reduce frame extraction (currently every 2 seconds)
- Implement virtualization for long transcripts

### Memory Issues
- Reduce MAX_HISTORY in store (currently 50)
- Clear old projects from local storage
- Limit concurrent operations

## Browser DevTools

### Redux DevTools (if installed)
```
Redux DevTools → Actions tab
- Look for setProject action
- Check payload for words and scenes arrays
- Trace state changes
```

### React DevTools
```
React DevTools → Components tab
- Inspect Timeline component
- Check props passed to children
- Verify re-renders aren't excessive
```

### Network Tab
```
Network → Preview tab (for API responses)
- Check /api/project/{id} response
- Verify frames, scenes, segments are present
- Check for CORS errors
```

## Still Not Working?

1. **Clear cache:**
   ```bash
   npm run dev  # Vite will rebuild
   # OR manually clear browser cache
   ```

2. **Check backend logs:**
   ```bash
   # Terminal running backend should show:
   # "Extracting N frames..."
   # "Detected N scenes"
   # "Processed transcription"
   ```

3. **Verify API response:**
   ```javascript
   // In browser console:
   fetch('/api/project/YOUR_PROJECT_ID')
     .then(r => r.json())
     .then(d => console.log(d))
   ```

4. **Check .env configuration:**
   ```bash
   # backend/.env should have:
   OPENAI_API_KEY=sk-...
   NODE_ENV=development
   PORT=3001
   ```

5. **Restart services:**
   ```bash
   # Kill all processes
   lsof -ti:3000,3001 | xargs kill -9
   
   # Restart
   npm run dev
   ```

## Report Issues With:
- Browser version and DevTools console errors
- Video file format and duration
- Backend server logs (search for errors)
- State dump from Redux DevTools
- Screenshot of what you see vs. what you expect

