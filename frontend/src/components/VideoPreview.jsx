import { useEffect, useRef, useState } from 'react';
import useEditorStore from '../store/useEditorStore';
import { findWordAtTime, findWordsInRange } from '../utils/transcriptParser';
import { formatTime } from '../utils/time';

function VideoPreview() {
  const {
    videoUrl,
    isPlaying,
    playheadTime,
    setPlayheadTime,
    setIsPlaying,
    words,
    layers,
    layout
  } = useEditorStore();

  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);

  // Find active word and words for caption overlay
  const activeWord = words && words.length > 0 ? findWordAtTime(words, playheadTime) : null;
  const currentSegmentWords = activeWord 
    ? words.filter(w => w.segmentId === activeWord.segmentId)
    : [];

  // Sync video with playhead
  useEffect(() => {
    if (videoRef.current && videoReady) {
      const video = videoRef.current;
      const timeDiff = Math.abs(video.currentTime - playheadTime);
      
      // Only seek if difference is significant (>0.1s) to avoid jitter
      if (timeDiff > 0.1) {
        video.currentTime = playheadTime;
      }
    }
  }, [playheadTime, videoReady]);

  // Handle video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setPlayheadTime(videoRef.current.currentTime);
    }
  };

  // Handle play/pause
  useEffect(() => {
    if (videoRef.current && videoReady) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoReady]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) {
            setPlayheadTime(Math.max(0, playheadTime - 0.1));
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) {
            setPlayheadTime(Math.min(videoRef.current.duration || 0, playheadTime + 0.1));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, playheadTime, setIsPlaying, setPlayheadTime]);

  if (!videoUrl) {
    return (
      <div className="flex-1 bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">No video loaded</p>
      </div>
    );
  }

  const getAspectRatioClass = () => {
    switch (layout) {
      case '9:16':
        return 'aspect-[9/16] h-full max-h-[90%]';
      case '4:5':
        return 'aspect-[4/5] h-full max-h-[92%]';
      case '1:1':
        return 'aspect-square h-full max-h-[92%]';
      case '4:3':
        return 'aspect-[4/3] w-full max-w-[92%]';
      case '2.35:1':
        return 'aspect-[235/100] w-full max-w-[92%]';
      case '16:9':
      default:
        return 'aspect-video w-full max-w-[92%]';
    }
  };

  return (
    <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
      <div className={`relative bg-black rounded-xl shadow-2xl overflow-hidden ${getAspectRatioClass()}`}>
      <video
        ref={videoRef}
        src={videoUrl}
          className="w-full h-full object-contain"
        onLoadedMetadata={() => setVideoReady(true)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Caption Overlay - Single line at bottom like movie subtitles */}
      {layers.captions.visible && currentSegmentWords.length > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full px-4">
          <div
            className="inline-flex flex-wrap justify-center gap-1 w-full"
            style={{
              fontSize: `${layers.captions.style.fontSize}px`,
              color: layers.captions.style.color,
              textAlign: layers.captions.style.alignment
            }}
          >
            {currentSegmentWords.map((word) => {
              const isActive = activeWord?.id === word.id;
              return (
                <span
                  key={word.id}
                  className={`transition-all ${
                    isActive
                      ? 'text-yellow-300 font-bold'
                      : 'text-white'
                  }`}
                  style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.9)'
                  }}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        </div>
      )}

        {/* Playhead indicator */}
        <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatTime(playheadTime)}
        </div>

        {/* Play/Pause overlay button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {!isPlaying && (
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export default VideoPreview;

