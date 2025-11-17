# Timeline Visual Guide

## What You Should See

### 1. Timeline Overview (h-80 total height)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Audio Waveform Track] (Purple waves) - h-16                        │
├─────────────────────────────────────────────────────────────────────┤
│ [📷] [📷] [📷] [📷] [📷] (Frames Strip) - h-16                      │
├─────────────────────────────────────────────────────────────────────┤
│ ▲ = Playhead (Blue line, appears on all tracks)                     │
│                                                                       │
│ ┌─ SCENE TRACK (h-24) ────────────────────────────────────────────┐  │
│ │  ┌──────────────┬──────────────┬──────────┐                     │  │
│ │  │    [1]       │     [2]      │   [3]    │  ← Scene Numbers    │  │
│ │  │  [Scene 1]   │  [Scene 2]   │ [Scene3] │  ← Thumbnails      │  │
│ │  │  0:00 - 0:05 │  0:05 - 0:10 │ 0:10-END │  ← Duration        │  │
│ │  └──────────────┴──────────────┴──────────┘                     │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌─ WORD TRACK (h-20) ─────────────────────────────────────────────┐  │
│ │ ┌─────────────────────────────────── Phrase Group 1 ──────────┐ │  │
│ │ │ [Hey] [everyone] [welcome] [to] [my] [channel] [today]      │ │  │
│ │ └─────────────────────────────────────────────────────────────┘ │  │
│ │ ┌─────────────────────────────────── Phrase Group 2 ──────────┐ │  │
│ │ │ [Thanks] [for] [watching] [please] [like] [and] [subscribe]│ │  │
│ │ └─────────────────────────────────────────────────────────────┘ │  │
│ └──────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│ [⏪] [⏩] [🔖] 0:02.5 / 0:45.2 [🔴] [▶] [1x▼] [🔀] [−] 53% [+] [≡] │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Scene Track Close-Up

```
┌─────────────────────────────────────────────────────────┐
│ ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────┐   │
│ │    [1]   │  │    [2]   │  │  [3]   │  │  [4]   │   │
│ │ ┌──────┐ │  │ ┌──────┐ │  │┌──────┐│  │┌──────┐│   │
│ │ │######│ │  │ │######│ │  ││######││  ││######││   │
│ │ │######│ │  │ │######│ │  ││######││  ││######││   │
│ │ │######│ │  │ │######│ │  ││######││  ││######││   │
│ │ └──────┘ │  │ └──────┘ │  │└──────┘│  │└──────┘│   │
│ │0:00-0:05 │  │0:05-0:10 │  │0:10-015│  │0:15-020│   │
│ └──────────┘  └──────────┘  └────────┘  └────────┘   │
│      ▲                                                 │
│      └─ Blue ring when selected                       │
│                                                        │
│ Click any scene block to jump playhead to that scene  │
└─────────────────────────────────────────────────────────┘
```

**Color States:**
- Default: Gray background (bg-gray-50)
- Hover: Slightly darker gray with ring
- Selected: Blue ring (ring-2 ring-blue-500)
- Playhead over: Stays same, but shows timeline syncs

### 3. Word Track Close-Up

```
Without Selection (Normal State):
┌──────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────── Light Purple ──┐│
│ │[Hey] [everyone] [welcome] [to] [my] [channel]    ││
│ │Gray  Gray      Gray      Gray Gray Gray           ││
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘

While Playing (Active Word):
┌──────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────── Light Purple ──┐│
│ │[Hey] [everyone] [welcome] [to] [my] [channel]    ││
│ │Gray  ┌────────┐ Gray      Gray Gray Gray           ││
│ │      │everyone│                                     ││
│ │      │ BLUE   │ ← Blue fill with white text       ││
│ │      └────────┘                                     ││
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘

User Selected Word:
┌──────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────── Light Purple ──┐│
│ │[Hey] [everyone] [welcome] [to] [my] [channel]    ││
│ │Gray  ┌──────────────┐ Gray   Gray Gray Gray        ││
│ │      │ everyone     │                              ││
│ │      │ Blue ring    │ ← Bright blue outline       ││
│ │      │ Light blue bg│                              ││
│ │      └──────────────┘                              ││
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Word Block States:**
| State | Background | Text | Border | Effect |
|-------|-----------|------|--------|--------|
| Default | Gray | Gray | None | None |
| Hover | Darker gray | Gray | None | Cursor pointer |
| Active (Playing) | Blue | White | Blue ring | Shadow |
| Selected | Light blue | Blue | Blue ring | Ring-2 |

### 4. Playhead Interaction

```
Vertical Blue Line Moving Across Timeline:
│
▼ ← Appears on top of all tracks
│   Has small white circle at top
│   Can click and drag to scrub
│
Timeline:  [Scene1]  [Scene2]  [Scene3]
Words:     [Hey][ev][welcome] [to]
Audio:     ▁▂▄▅▆▅▄▂▁▂▅▆▅▄▂▁

↓
User clicks on "welcome":
│
  ▼ ← Playhead jumps to "welcome" start time
  │
Timeline:  [Scene1]  [Scene2]  [Scene3]
Words:     [Hey][ev]▼[welcome] [to]
Audio:     ▁▂▄▅▆▅▄▂│▂▅▆▅▄▂▁

Video plays:
│   ▼ ← Playhead moves right as video plays
│   │
Timeline:  [Scene1]  [Scene2]  [Scene3]
Words:     [Hey][ev][welcome]▼[to]
Audio:     ▁▂▄▅▆▅▄▂▁▂▅▆▅▄▂│▁
           ▲ Active word highlights blue

User drags playhead:
│
░░░▼░░░░ ← Can click and drag blue line
    │    ← Video scrubs to new position
Timeline:  [Scene1]  [Scene2]  [Scene3]
Words:     [Hey][ev][welcome][to]▼[more]
```

### 5. Timeline Controls

```
┌─ Header Controls ─────────────────────────────────────────┐
│                                                            │
│ [⏪] [⏩] [🔖] 0:02.5 / 0:45.2 [🔴] [▶] [1x ▼] [🔀] [−] 53% [+] [≡]
│  │   │   │   │ │        │        │   │  │     │   │  │ │  │  │
│  │   │   │   │ │        │        │   │  │     │   │  │ │  │  └─ Layout toggle
│  │   │   │   │ │        │        │   │  │     │   │  │ │  └──── Zoom +
│  │   │   │   │ │        │        │   │  │     │   │  │ └─────── Zoom %
│  │   │   │   │ │        │        │   │  │     │   │  └────────── Zoom -
│  │   │   │   │ │        │        │   │  │     │   └───────────── Split tool
│  │   │   │   │ │        │        │   │  │     └──────────────── Playback speed
│  │   │   │   │ │        │        │   │  └────────────────────── Play/Pause ▶
│  │   │   │   │ │        │        │   └──────────────────────── Record 🔴
│  │   │   │   │ │        │        └──────────────────────────── Duration total
│  │   │   │   │ └────────────────────────────────────────────── Current time
│  │   │   │   └────────────────────────────────────────────────── Bookmark
│  │   │   └──────────────────────────────────────────────────────── Next edit
│  │   └───────────────────────────────────────────────────────────── Prev edit
│  └────────────────────────────────────────────────────────────────── Jump to start
│
│ Colors:
│ - Default buttons: Gray text on white
│ - Hover: Light gray background
│ - Active (playing): Blue highlight
│ - Recording: Red 🔴 button
└────────────────────────────────────────────────────────────────────┘
```

## Interactions You Should Be Able to Do

### 1. Click Word to Jump
```
Before:     [Hey] [everyone] [welcome] [to]
            Playhead at start (0:00)

Click "welcome":
            [Hey] [everyone] ▼[welcome] [to]
            Playhead jumps to "welcome" start time (~0:02.5)
            Video also plays from that point
```

### 2. Click Scene to Jump
```
Before:     [Scene 1]  [Scene 2]
            Playhead at Scene 1 start

Click Scene 2:
            [Scene 1]  ▼[Scene 2]
            Blue ring appears around Scene 2
            Playhead jumps to Scene 2 start
            Video plays from that time
```

### 3. Play Video (Active Word Highlight)
```
Before:     [Hey] [everyone] [welcome] [to]
            (no highlighting, paused)

Click Play:
Frame 1:    ▼[Hey] [everyone] [welcome] [to]
            "Hey" is blue (playing)

Frame 2:    [Hey] ▼[everyone] [welcome] [to]
            "everyone" is blue (playing)

Frame 3:    [Hey] [everyone] ▼[welcome] [to]
            "welcome" is blue (playing)
```

### 4. Drag Playhead (Scrub)
```
Before:     ▼[Hey] [everyone] [welcome]
            (playhead at start)

During drag: [Hey] [everyone] ▼[welcome]
            (playhead moved manually)
            Video stops and seeks to new position

After release:
            [Hey] [everyone] ▼[welcome]
            Video can resume playing from new position
```

### 5. Zoom Timeline
```
Before:     [Hey] [everyone] [welcome] [to] [my] [channel]
            1 second per visible area

Click "+" 3 times (53% → 63% → 73% → 83%):
            [He][ev][we][to][my][ch]
            Words become smaller, more visible on screen
            (Zoom level increases from ~1px/s to ~2px/s)

Click "-" 3 times (83% → 73% → 63% → 53%):
            [Hey]    [everyone]    [welcome]
            Words become larger, less visible on screen
            (Zoom level decreases, shows fewer words)
```

## Expected Appearance

### Colors Palette
```
Primary Blue:       #3b82f6  ← Playhead, active states
Light Gray:         #f3f4f6  ← Scene track background
White:              #ffffff  ← Word track background
Dark Gray:          #1f2937  ← Timeline background
Purple (Waveform):  #a78bfa  ← Audio visualization
```

### Spacing & Sizing
```
Timeline Container:      h-80 (320px)
├── Waveform Track:      h-16 (64px)
├── Frames Strip:        h-16 (64px)
├── Timeline Content:    flex-1 (fills remaining)
│   ├── Scene Track:     h-24 (96px)
│   └── Word Track:      h-20 (80px)
└── Controls:            auto (fits content)

Word Block:
├── Min width:           30px
├── Height:              h-12 (48px)
├── Padding:             px-1.5, py-1
└── Rounded:             rounded (4px radius)

Scene Block:
├── Min width:           100px
├── Height:              80px
├── Padding:             p-2
└── Rounded:             rounded (4px radius)
```

## What NOT to Expect

❌ Scene thumbnails to show immediately (takes time to extract)
❌ Words to be perfectly aligned word-by-word with syllables
❌ Drag-to-reorder scenes (visual only for now)
❌ Trim handles to be functional (visual only for now)
❌ Keyboard shortcuts to work (not yet implemented)
❌ Right-click context menu (not yet implemented)
❌ Undo/redo on timeline (state management only)
❌ Export preview (next phase)

## Animations You Should See

```
✨ Smooth Transitions:
- Playhead movement: Linear transition
- Word highlighting: Instant (blue fill)
- Scene selection: Smooth ring appearance
- Hover effects: Quick background change

🎯 Auto-scroll:
- If playhead moves off-screen right, timeline auto-scrolls left
- If playhead moves off-screen left, timeline auto-scrolls right
- Keeps playhead centered in view when possible
```

## Performance Characteristics

With a 10-minute video:
- ~600 words on timeline (depends on speaking pace)
- ~5-10 scenes
- ~300 frame thumbnails (1 every 2 seconds)
- Should still be smooth at 60fps

If experiencing stuttering:
- Reduce zoom level (shows fewer words)
- Disable frame preview
- Use browser's Performance tab to identify bottleneck

## Quick Reference Card

| Action | Result |
|--------|--------|
| Click word | Playhead jumps to word start, video seeks |
| Click scene | Playhead jumps to scene start, video seeks |
| Play video | Playhead moves, active word highlights blue |
| Drag playhead | Video scrubs to new position |
| Scroll timeline | View pans left/right |
| Click + | Zoom in (more detail, fewer words visible) |
| Click − | Zoom out (less detail, more words visible) |
| Double-click word | (Future) Edit word text |
| Right-click scene | (Future) Scene options menu |
| Drag scene edge | (Future) Trim scene in/out points |

