# 🚨 QUICK FIX - Make Frames Visible NOW

## Problem
You're seeing only ONE thumbnail per scene instead of multiple frames.

## Two Possible Causes

### Cause 1: Frames Are Rendering But Look Like One Image
The frames might be rendering, but they're so small or similar that they look like one continuous image.

### Cause 2: Scene Container Width Issue
The scene width might be too narrow to display multiple frames.

---

## IMMEDIATE FIX - Steps to Follow

### Step 1: Open Browser Console (F12)

Look for these messages:
```
SceneTrack - Total frames available: X
Rendering N placeholder frames for scene scene-0
```

**Write down the numbers you see:**
- Total frames: ______
- Frames for scene-0: ______
- Placeholder count: ______

### Step 2: Check Timeline Zoom

At the bottom of the timeline, you should now see **100%** (not 10000%).

If it's too low (like 30% or 50%), click the **+** button to zoom in to 100% or higher.

**Why?** At low zoom levels, frames become tiny (less than 60px) and might overlap or look like one image.

### Step 3: Inspect a Scene Element

1. Right-click on a scene in the timeline
2. Select "Inspect Element"
3. In the Elements tab, look for:

```html
<div class="absolute flex cursor-pointer..." style="left: 0px; width: XXXpx; height: 68px;">
  <!-- You should see MULTIPLE <div> children here -->
  <div class="relative flex-shrink-0 border-r..." style="width: 60px; height: 68px;">
    <img src="..." />
  </div>
  <div class="relative flex-shrink-0 border-r..." style="width: 60px; height: 68px;">
    <img src="..." />
  </div>
  <div class="relative flex-shrink-0 border-r..." style="width: 60px; height: 68px;">
    <img src="..." />
  </div>
  <!-- ... more divs ... -->
</div>
```

**Count the number of `<div class="relative flex-shrink-0">` elements inside.**

- If you see **only 1 or 2**, something is wrong with rendering
- If you see **5-20**, frames ARE rendering (continue to Step 4)

### Step 4: Check Frame Visibility

If you see multiple frame divs but they look like one image:

**Option A: They might all show the same thumbnail**
- This is expected for old projects (placeholder mode)
- The repeated thumbnail creates a filmstrip effect
- **This is CORRECT behavior!**

**Option B: Zoom is too low**
- Zoom to 150% or 200%
- Frames should become wider and more distinct

### Step 5: Take Screenshot

Take a screenshot of:
1. The entire timeline area
2. The browser console showing the debug messages
3. The Elements tab showing the scene div structure

---

## What You SHOULD See (Success!)

### Visual:
```
┌───────────────────────────────────────────────┐
│ Scene 1                                       │
│ [1][img][img][img][img][img][img][img]...    │
│    ↑    ↑    ↑    ↑    ↑    ↑    ↑           │
│  badge  frame frame frame (visible borders)   │
└───────────────────────────────────────────────┘
```

### Console:
```
SceneTrack - Total frames available: 15
SceneTrack - Scenes: 1
Scene scene-0: 0s-7.5s, Frames: 0
Rendering 15 placeholder frames for scene scene-0 (duration: 7.5s)
```

### HTML (DevTools):
```
<div style="width: 900px"> <!-- Scene container -->
  <div style="width: 60px"> <!-- Frame 1 -->
  <div style="width: 60px"> <!-- Frame 2 -->
  <div style="width: 60px"> <!-- Frame 3 -->
  ...15 frames total
</div>
```

---

## What You Might Be Seeing (Needs Fix)

### Case A: Only ONE Large Thumbnail
```
┌───────────────────────────────────────────────┐
│ Scene 1                                       │
│ [  ONE BIG THUMBNAIL COVERING EVERYTHING  ]  │
└───────────────────────────────────────────────┘
```

**Console shows:**
```
Rendering 15 placeholder frames...
```

**But HTML shows:**
```
<div style="width: 50px"> <!-- Scene TOO NARROW -->
  <div style="width: 60px"> <!-- Only first frame visible -->
  <div style="width: 60px"> <!-- Hidden (overflow) -->
  <div style="width: 60px"> <!-- Hidden (overflow) -->
</div>
```

**FIX:** Zoom in! The scene is narrower than the frames.

### Case B: Frames Exist But Not Visible
**Console shows:** `Rendering 15 placeholder frames...`

**HTML shows:** 15 frame divs

**But visually:** Only see 1 image

**Possible reasons:**
1. Frames are stacked (CSS z-index issue)
2. Frames have `position: absolute` (they shouldn't)
3. Parent container doesn't have `display: flex`

**FIX:**
Check the scene container has:
```css
display: flex;       /* ✓ Must be present */
flex-direction: row; /* Default, should be row */
```

Check frame divs have:
```css
position: relative;  /* ✓ Not absolute */
flex-shrink: 0;     /* ✓ Prevents compression */
```

---

## Testing Commands

### Test 1: Temporarily Make Frames Colorful

To see if frames are rendering, let's make them obviously different colors.

Open `frontend/src/components/SceneTrack.jsx` and find line ~169:

Change:
```javascript
className="relative flex-shrink-0 border-r border-gray-700 bg-gray-800"
```

To:
```javascript
className="relative flex-shrink-0 border-r border-gray-700"
style={{
  width: `${Math.max(frameWidth, minFrameWidth)}px`,
  height: '68px',
  backgroundColor: `hsl(${(frameIdx * 30) % 360}, 70%, 50%)` // Rainbow colors!
}}
```

**Save and refresh browser.**

**Expected:** You should see a rainbow of colored frames!

If you see:
- ✅ **Multiple colored boxes** → Frames ARE rendering! Issue is just with images.
- ❌ **Only one color** → Frames aren't rendering correctly. Layout issue.

---

## Common Issues & Solutions

### Issue 1: "I see colored boxes but not images"

**Solution:** Images are loading but maybe broken paths.

Check Network tab:
- Do you see 404 errors for frame images?
- Fix: Re-upload video or check backend frame extraction

### Issue 2: "I still see only one thumbnail"

**Check:**
```javascript
// In SceneTrack, scene container should have flex
className={`absolute flex cursor-pointer...`}
//                  ↑ THIS IS CRITICAL
```

If missing, frames will stack vertically or on top of each other.

### Issue 3: "Frames are tiny"

**Solution:** Increase zoom level to 150-200%

OR

Temporarily increase minimum frame width:
```javascript
const minFrameWidth = 100; // Changed from 60
```

### Issue 4: "Scene is too narrow"

The scene width is calculated as:
```javascript
width: timeToPixels(scene.end - scene.start, zoomLevel)
```

If zoom is low, width is small.

Example:
- Scene: 5 seconds
- Zoom: 50 (50px per second)
- Width: 5 × 50 = 250px
- Frames needed: 10 × 60px = 600px
- **Result: Overflow, only 4 frames visible**

**Solution:** Increase zoom OR reduce frame count:
```javascript
const displayFrameCount = Math.min(
  estimatedFrameCount,
  Math.floor(scene.width / minFrameWidth) // Fit to scene width
);
```

---

## Next Steps

After trying the above:

1. **Share your findings:**
   - What you see in console
   - What you see in HTML inspector
   - Screenshot of timeline

2. **Try the rainbow color test**
   - This will definitively show if frames are rendering

3. **Check zoom level**
   - Try 100%, 150%, 200%
   - Does appearance change?

4. **If still stuck, provide:**
   - Browser console output
   - Screenshot of timeline
   - Screenshot of DevTools Elements tab
   - Value of `scene.width` and `frameWidth` from console

---

**TL;DR:**
1. Open console, look for "Rendering N placeholder frames"
2. Zoom to 100% or higher
3. Inspect scene div, count child frames
4. Try rainbow color test
5. Report findings


