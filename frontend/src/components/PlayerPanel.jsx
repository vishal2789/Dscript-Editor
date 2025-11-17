import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import useEditorStore from '../store/useEditorStore';
import CanvasOverlay from './CanvasOverlay';

function PlayerPanel() {
  const {
    project,
    currentTime,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    selectedSegmentId
  } = useEditorStore();
  
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);

  // Sync player with store
  useEffect(() => {
    if (playerRef.current && playerReady) {
      const player = playerRef.current.getInternalPlayer();
      if (player) {
        if (isPlaying && player.paused) {
          player.play();
        } else if (!isPlaying && !player.paused) {
          player.pause();
        }
      }
    }
  }, [isPlaying, playerReady]);

  // Seek to selected segment
  useEffect(() => {
    if (selectedSegmentId && project) {
      const segment = project.transcriptionSegments.find(s => s.id === selectedSegmentId);
      if (segment && playerRef.current) {
        playerRef.current.seekTo(segment.start);
        setCurrentTime(segment.start);
      }
    }
  }, [selectedSegmentId, project, setCurrentTime]);

  const handleProgress = (state) => {
    setCurrentTime(state.playedSeconds);
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleSeek = (time) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time);
      setCurrentTime(time);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'j':
          if (playerRef.current) {
            handleSeek(Math.max(0, currentTime - 10));
          }
          break;
        case 'l':
          if (playerRef.current) {
            handleSeek(Math.min(project?.duration || 0, currentTime + 10));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTime, isPlaying, project, setIsPlaying]);

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">No project loaded</p>
      </div>
    );
  }

  const videoUrl = `http://localhost:3001/uploads/${project.filePath}`;

  return (
    <div className="flex-1 bg-gray-900 relative flex items-center justify-center">
      <div className="relative w-full h-full max-w-5xl">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={isPlaying}
          onProgress={handleProgress}
          onPlay={handlePlay}
          onPause={handlePause}
          onReady={() => setPlayerReady(true)}
          width="100%"
          height="100%"
          controls
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload'
              }
            }
          }}
        />
        
        {/* Canvas overlay for text/graphics */}
        <CanvasOverlay currentTime={currentTime} />
      </div>

      {/* Playback controls overlay */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 rounded-lg px-4 py-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-white hover:text-gray-300"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span className="text-white text-sm">
          {formatTime(currentTime)} / {formatTime(project.duration || 0)}
        </span>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default PlayerPanel;

