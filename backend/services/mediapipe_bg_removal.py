#!/usr/bin/env python3
"""
Optimized MediaPipe Background Removal Service
Key features:
- Uses MediaPipe SelfieSegmentation for high-quality background removal
- Proper worker initialization with MediaPipe session
- Consistent frame indexing
- Better error handling and logging
- Frame similarity detection to skip similar frames
"""

import sys
import json
import os
import tempfile
import subprocess
import urllib.request
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
import shutil

import cv2
import numpy as np
import mediapipe as mp
from skimage.metrics import structural_similarity as compare_ssim

# Global variable for per-process MediaPipe session
_worker_mp_segmentation = None

def worker_init(model_selection: int = 1):
    """Initialize MediaPipe SelfieSegmentation once per worker process."""
    global _worker_mp_segmentation
    try:
        # model_selection: 0 = general model, 1 = landscape model (faster, better for selfies)
        mp_selfie_segmentation = mp.solutions.selfie_segmentation
        _worker_mp_segmentation = mp_selfie_segmentation.SelfieSegmentation(model_selection=model_selection)
        print(f"[Worker {os.getpid()}] MediaPipe initialized with model selection '{model_selection}'", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"[Worker {os.getpid()}] FAILED to initialize MediaPipe: {e}", file=sys.stderr, flush=True)
        raise

def calculate_frame_similarity_ssim(frame1, frame2):
    """Return difference [0,1] where 0=identical, 1=totally different using SSIM."""
    small_size = (320, 180)
    g1 = cv2.resize(cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY), small_size)
    g2 = cv2.resize(cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY), small_size)
    score = compare_ssim(g1, g2)
    score = max(-1.0, min(1.0, float(score)))
    return 1.0 - score

def get_background_image(background_type, background_value, width, height):
    """Load and prepare background image or color."""
    if background_type == 'color':
        hexv = background_value.lstrip('#')
        if len(hexv) != 6:
            raise ValueError(f'Invalid hex color: {background_value}')
        r, g, b = int(hexv[0:2], 16), int(hexv[2:4], 16), int(hexv[4:6], 16)
        bg = np.full((height, width, 3), (b, g, r), dtype=np.uint8)
        return bg
    elif background_type == 'image':
        if background_value.startswith('http://') or background_value.startswith('https://'):
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            try:
                urllib.request.urlretrieve(background_value, tmp.name)
                img = cv2.imread(tmp.name)
            finally:
                try:
                    tmp.close()
                    os.unlink(tmp.name)
                except:
                    pass
        else:
            img = cv2.imread(background_value)
        
        if img is None:
            raise ValueError(f'Failed to load background image: {background_value}')
        img = cv2.resize(img, (width, height))
        return img
    else:
        raise ValueError(f'Unknown background_type: {background_type}')

def process_frame_using_global_seg(args):
    """Worker function that processes a single frame using the global MediaPipe session."""
    global _worker_mp_segmentation
    frame_path, mask_out_path, composite_out_path, background_path, blur_radius = args

    try:
        if _worker_mp_segmentation is None:
            raise RuntimeError('Worker MediaPipe session not initialized')

        # Read frame
        frame = cv2.imread(frame_path)
        if frame is None:
            raise FileNotFoundError(f'Cannot read frame: {frame_path}')

        # Read background
        background = cv2.imread(background_path)
        if background is None:
            raise FileNotFoundError(f'Cannot read background: {background_path}')

        # Convert BGR to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe SelfieSegmentation
        results = _worker_mp_segmentation.process(frame_rgb)
        
        # Get segmentation mask (0-255, where 255 is foreground)
        if results.segmentation_mask is not None:
            mask = (results.segmentation_mask * 255).astype(np.uint8)
        else:
            # Fallback: full foreground mask
            mask = np.ones((frame.shape[0], frame.shape[1]), dtype=np.uint8) * 255

        # Optional blur for smoother edges
        if blur_radius and blur_radius > 0:
            k = int(max(1, (blur_radius // 2) * 2 + 1))
            mask = cv2.GaussianBlur(mask, (k, k), 0)

        # Composite: foreground * mask + background * (1 - mask)
        mask_f = (mask.astype(np.float32) / 255.0)[..., None]
        fg = frame.astype(np.float32)
        bg = background.astype(np.float32)
        composite = (fg * mask_f + bg * (1.0 - mask_f)).astype(np.uint8)

        # Save outputs
        cv2.imwrite(mask_out_path, mask)
        cv2.imwrite(composite_out_path, composite)
        
        return True, None
    except Exception as exc:
        error_msg = f"Error processing {Path(frame_path).name}: {str(exc)}"
        return False, error_msg


def process_video_scene(input_video_path, scene_start, scene_end, output_video_path, 
                       background_type, background_value, frames_dir, 
                       similarity_threshold=0.12, processing_fps=15, use_fast_model=False, 
                       disable_skip=False, blur_mask_radius=7, max_workers=4):
    """Main scene processor with improved robustness."""
    
    print(f"=== Starting Optimized Processing ===", file=sys.stderr, flush=True)
    print(f"Input: {input_video_path}", file=sys.stderr, flush=True)
    print(f"Scene: {scene_start}s - {scene_end}s", file=sys.stderr, flush=True)
    print(f"Background: {background_type} = {background_value}", file=sys.stderr, flush=True)

    frames_path = Path(frames_dir)
    frames_path.mkdir(parents=True, exist_ok=True)

    # Extract frames
    scene_duration = scene_end - scene_start
    actual_fps = processing_fps if scene_duration >= 1.0 else max(10, int(1.0 / scene_duration))
    
    print(f"Extracting frames at {actual_fps} fps...", file=sys.stderr, flush=True)
    frame_pattern = str(frames_path / 'frame_%04d.jpg')
    extract_cmd = [
        'ffmpeg', '-y', '-i', input_video_path,
        '-ss', str(scene_start), '-t', str(scene_duration),
        '-vf', f'fps={actual_fps}',
        frame_pattern
    ]
    
    result = subprocess.run(extract_cmd, check=True, capture_output=True, text=True, timeout=60)
    
    frame_files = sorted(frames_path.glob('frame_*.jpg'))
    if not frame_files:
        raise RuntimeError('No frames extracted from video')
    
    total_frames = len(frame_files)
    print(f"✓ Extracted {total_frames} frames", file=sys.stderr, flush=True)

    # Prepare output directories
    masks_dir = frames_path / 'masks'
    comps_dir = frames_path / 'composites'
    masks_dir.mkdir(exist_ok=True)
    comps_dir.mkdir(exist_ok=True)

    # Load first frame and prepare background
    print("Preparing background...", file=sys.stderr, flush=True)
    first = cv2.imread(str(frame_files[0]))
    if first is None:
        raise RuntimeError(f'Cannot read first frame: {frame_files[0]}')
    
    h, w = first.shape[:2]
    print(f"Frame dimensions: {w}x{h}", file=sys.stderr, flush=True)
    
    background = get_background_image(background_type, background_value, w, h)
    
    # Cache background to disk for workers
    bg_cache_path = frames_path / 'bg_cache.jpg'
    cv2.imwrite(str(bg_cache_path), background)
    print(f"✓ Background cached at {bg_cache_path}", file=sys.stderr, flush=True)

    # Determine frames to process (with similarity detection)
    print("Analyzing frame similarity...", file=sys.stderr, flush=True)
    frames_to_process = [0]
    reuse_map = {}
    last_idx = 0
    last_frame = first

    if not disable_skip and total_frames > 1:
        for i in range(1, total_frames):
            cur = cv2.imread(str(frame_files[i]))
            if cur is None:
                reuse_map[i] = last_idx
                continue
            
            diff = calculate_frame_similarity_ssim(last_frame, cur)
            if diff >= similarity_threshold:
                frames_to_process.append(i)
                last_frame = cur
                last_idx = i
            else:
                reuse_map[i] = last_idx
    else:
        frames_to_process = list(range(total_frames))

    print(f"✓ Will process {len(frames_to_process)} unique frames (skip {len(reuse_map)} similar)", file=sys.stderr, flush=True)

    # Prepare worker arguments
    # MediaPipe model selection: 1 = landscape model (faster, better for selfies), 0 = general model
    mp_model_selection = 1 if use_fast_model else 0
    print(f"Using MediaPipe model selection: {mp_model_selection} ({'fast/landscape' if use_fast_model else 'general'})", file=sys.stderr, flush=True)
    
    worker_args = []
    for idx in frames_to_process:
        fp = str(frame_files[idx])
        # Use 1-based numbering for output files (frame_0001.jpg -> composite_0001.jpg)
        mask_out = str(masks_dir / f'mask_{idx+1:04d}.png')
        comp_out = str(comps_dir / f'composite_{idx+1:04d}.jpg')
        worker_args.append((fp, mask_out, comp_out, str(bg_cache_path), blur_mask_radius))

    # Process frames with worker pool
    successful = 0
    errors = []
    
    if worker_args:
        print(f"Starting parallel processing with {min(max_workers, len(worker_args))} workers...", file=sys.stderr, flush=True)
        
        with ProcessPoolExecutor(
            max_workers=min(max_workers, len(worker_args)), 
            initializer=worker_init, 
            initargs=(mp_model_selection,)
        ) as exe:
            futures = {exe.submit(process_frame_using_global_seg, arg): arg for arg in worker_args}
            completed = 0
            
            for fut in as_completed(futures):
                completed += 1
                ok, error = fut.result()
                if ok:
                    successful += 1
                else:
                    if error:
                        errors.append(error)
                
                if completed % 10 == 0 or completed == len(futures):
                    print(f"Progress: {completed}/{len(futures)} ({successful} successful)", file=sys.stderr, flush=True)

    print(f"✓ Processed {successful}/{len(worker_args)} unique frames", file=sys.stderr, flush=True)
    
    if errors:
        print(f"⚠ Encountered {len(errors)} errors:", file=sys.stderr, flush=True)
        for err in errors[:5]:
            print(f"  - {err}", file=sys.stderr, flush=True)

    # Copy results for skipped similar frames
    if reuse_map:
        print(f"Copying results for {len(reuse_map)} similar frames...", file=sys.stderr, flush=True)
        copied = 0
        for target_idx, source_idx in reuse_map.items():
            src_mask = masks_dir / f'mask_{source_idx+1:04d}.png'
            src_comp = comps_dir / f'composite_{source_idx+1:04d}.jpg'
            tgt_mask = masks_dir / f'mask_{target_idx+1:04d}.png'
            tgt_comp = comps_dir / f'composite_{target_idx+1:04d}.jpg'
            
            if src_comp.exists():
                shutil.copy2(src_comp, tgt_comp)
                copied += 1
            if src_mask.exists():
                shutil.copy2(src_mask, tgt_mask)
        print(f"✓ Copied {copied} composites", file=sys.stderr, flush=True)

    # Fill any remaining gaps
    existing = {p.name for p in comps_dir.glob('composite_*.jpg')}
    missing = []
    for i in range(total_frames):
        expected = f'composite_{i+1:04d}.jpg'
        if expected not in existing:
            missing.append(i)
            nearest = min(frames_to_process, key=lambda x: abs(x - i))
            src = comps_dir / f'composite_{nearest+1:04d}.jpg'
            dst = comps_dir / expected
            if src.exists():
                shutil.copy2(src, dst)
    
    if missing:
        print(f"⚠ Filled {len(missing)} missing composites from nearest frames", file=sys.stderr, flush=True)

    # Verify all composites exist
    final_composites = list(comps_dir.glob('composite_*.jpg'))
    print(f"Final check: {len(final_composites)} composites exist", file=sys.stderr, flush=True)
    
    if len(final_composites) < total_frames:
        raise RuntimeError(f"Missing composites: expected {total_frames}, found {len(final_composites)}")

    # Extract audio
    print("Extracting audio...", file=sys.stderr, flush=True)
    audio_path = frames_path / 'scene_audio.wav'
    extract_audio_cmd = [
        'ffmpeg', '-y', '-i', input_video_path, 
        '-ss', str(scene_start), '-t', str(scene_duration), 
        '-vn', '-acodec', 'pcm_s16le', str(audio_path)
    ]
    
    has_audio = False
    try:
        subprocess.run(extract_audio_cmd, check=True, capture_output=True, text=True, timeout=30)
        if audio_path.exists() and audio_path.stat().st_size > 0:
            has_audio = True
            print("✓ Audio extracted", file=sys.stderr, flush=True)
    except:
        print("⚠ No audio track or extraction failed", file=sys.stderr, flush=True)
        if audio_path.exists():
            audio_path.unlink()

    # Reconstruct video
    print("Reconstructing video...", file=sys.stderr, flush=True)
    composite_pattern = str(comps_dir / 'composite_%04d.jpg')
    
    if has_audio:
        cmd = [
            'ffmpeg', '-y', 
            '-framerate', str(actual_fps), 
            '-i', composite_pattern, 
            '-i', str(audio_path), 
            '-c:v', 'libx264', 
            '-c:a', 'aac', 
            '-pix_fmt', 'yuv420p', 
            '-crf', '23', 
            '-shortest', 
            output_video_path
        ]
    else:
        cmd = [
            'ffmpeg', '-y', 
            '-framerate', str(actual_fps), 
            '-i', composite_pattern, 
            '-c:v', 'libx264', 
            '-pix_fmt', 'yuv420p', 
            '-crf', '23', 
            output_video_path
        ]

    result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=120)
    
    # Verify output
    if not Path(output_video_path).exists():
        raise RuntimeError("Output video was not created")
    
    output_size = Path(output_video_path).stat().st_size
    print(f"✓ Video created: {output_video_path} ({output_size / 1024 / 1024:.2f} MB)", file=sys.stderr, flush=True)
    print("=== Processing Complete ===", file=sys.stderr, flush=True)
    
    return successful


if __name__ == '__main__':
    try:
        print("Reading input from stdin...", file=sys.stderr, flush=True)
        raw = sys.stdin.read()
        data = json.loads(raw)
        print("Input parsed successfully", file=sys.stderr, flush=True)

        count = process_video_scene(
            data['input_video'], 
            float(data['scene_start']), 
            float(data['scene_end']), 
            data['output_video'],
            data['background_type'], 
            data['background_value'], 
            data['frames_dir'],
            similarity_threshold=float(data.get('similarity_threshold', 0.12)),
            processing_fps=int(data.get('processing_fps', 15)),
            use_fast_model=bool(data.get('use_fast_model', False)),
            disable_skip=bool(data.get('disable_skip', False)),
            blur_mask_radius=int(data.get('blur_mask_radius', 7)),
            max_workers=int(data.get('max_workers', 4))
        )

        result = {'success': True, 'processed_frames': count}
        print("=== RESULT ===", file=sys.stderr, flush=True)
        print(json.dumps(result), flush=True)
        print("=== END ===", file=sys.stderr, flush=True)
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"ERROR: {str(e)}", file=sys.stderr, flush=True)
        print(error_detail, file=sys.stderr, flush=True)
        print(json.dumps({'success': False, 'error': str(e)}), flush=True)
        sys.exit(1)