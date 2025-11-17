import { useEffect, useMemo, useRef, useState } from 'react';
import useEditorStore from '../store/useEditorStore';
import SceneTrack from './SceneTrack';
import WordTrack from './WordTrack';
import Playhead from './Playhead';
import TimelineControls from './TimelineControls';
import TimeRuler from './TimeRuler';
import { calculateTimelineWidth, getVisibleTimeRange } from '../utils/timelineMath';
import { pixelsToTime } from '../utils/time';
import WaveSurfer from 'wavesurfer.js';

function Timeline() {
  const {
    videoDuration,
    playheadTime,
    setPlayheadTime,
    zoomLevel,
    timelineScrollLeft,
    setTimelineScrollLeft,
    videoUrl,
    project
  } = useEditorStore();

  const timelineRef = useRef(null);
  const waveformContainerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize waveform
  useEffect(() => {
    if (!waveformContainerRef.current || !videoUrl) return;

    let isMounted = true;
    const wavesurfer = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: '#94a3b8',
      progressColor: '#0ea5e9',
      cursorColor: '#0ea5e9',
      barWidth: 2,
      barRadius: 3,
      responsive: true,
      height: 30,
      normalize: true,
      backend: 'WebAudio',
      mediaControls: false
    });

    wavesurfer.load(videoUrl);

    wavesurfer.on('ready', () => {
      if (isMounted) {
        wavesurferRef.current = wavesurfer;
      }
    });

    wavesurfer.on('seek', (progress) => {
      if (isMounted) {
        const duration = wavesurfer.getDuration();
        if (duration > 0) {
          setPlayheadTime(progress * duration);
        }
      }
    });

    return () => {
      isMounted = false;
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        } catch (e) {
          console.warn('Error destroying waveform:', e);
        }
      }
    };
  }, [videoUrl, setPlayheadTime]);

  // Sync waveform with playhead
  useEffect(() => {
    if (wavesurferRef.current && videoDuration > 0) {
      const progress = playheadTime / videoDuration;
      wavesurferRef.current.seekTo(progress);
    }
  }, [playheadTime, videoDuration]);

  // Derive duration fallback if project duration missing
  const derivedDuration = useMemo(() => {
    if (videoDuration && videoDuration > 0) return videoDuration;
    if (project?.scenes?.length) {
      return Math.max(...project.scenes.map((scene) => scene.end || 0));
    }
    if (project?.transcriptionSegments?.length) {
      return Math.max(...project.transcriptionSegments.map((segment) => segment.end || 0));
    }
    return 60; // default 1 minute
  }, [videoDuration, project?.scenes, project?.transcriptionSegments]);

  // Calculate timeline width with sensible minimum
  const timelineWidth = Math.max(
    calculateTimelineWidth(derivedDuration, zoomLevel || 1),
    800
  );

  // Handle timeline click to scrub
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const scrollLeft = timelineRef.current.scrollLeft;
    const totalX = clickX + scrollLeft;
    
    const clickedTime = pixelsToTime(totalX, zoomLevel);
    setPlayheadTime(Math.max(0, Math.min(videoDuration, clickedTime)));
  };

  // Handle timeline drag to scrub
  const handleMouseDown = (e) => {
    if (e.target === timelineRef.current || e.target.closest('.timeline-content')) {
      setIsDragging(true);
      handleTimelineClick(e);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const scrollLeft = timelineRef.current.scrollLeft;
      const totalX = clickX + scrollLeft;
      
      const clickedTime = pixelsToTime(totalX, zoomLevel);
      setPlayheadTime(Math.max(0, Math.min(videoDuration, clickedTime)));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Auto-scroll timeline to keep playhead visible
  useEffect(() => {
    if (timelineRef.current) {
      const playheadPx = playheadTime * zoomLevel;
      const containerWidth = timelineRef.current.clientWidth;
      const scrollLeft = timelineRef.current.scrollLeft;
      
      if (playheadPx < scrollLeft + 50) {
        timelineRef.current.scrollLeft = Math.max(0, playheadPx - 50);
      } else if (playheadPx > scrollLeft + containerWidth - 50) {
        timelineRef.current.scrollLeft = playheadPx - containerWidth + 50;
      }
    }
  }, [playheadTime, zoomLevel]);

  return (
    <div className="h-80 bg-gray-900 flex flex-col border-t border-gray-700">
      {/* Timeline content area - Track Layers */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-800 border-b border-gray-700"
        onMouseDown={handleMouseDown}
      >
        <div
          className="timeline-content relative flex flex-col min-h-full"
          style={{ width: `${timelineWidth}px` }}
        >
          {/* Playhead */}
          <Playhead />

          {/* Time Ruler */}
          <TimeRuler />

          {/* Layer 1: Scene Track - Clips/Scenes with thumbnails */}
          <SceneTrack />

          {/* Layer 2: Word Track - Transcript/Words aligned to audio */}
          <WordTrack segments={project?.transcriptionSegments} />

          {/* Layer 3: Waveform Audio Track - Bottom layer (no border-t to touch transcript) */}
          <div className="bg-gray-900 flex items-center px-2 flex-shrink-0" style={{ height: '30px' }}>
            <div ref={waveformContainerRef} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* Timeline Controls */}
      <TimelineControls />
    </div>
  );
}

export default Timeline;
