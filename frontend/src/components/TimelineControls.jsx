import { useState } from 'react';
import useEditorStore from '../store/useEditorStore';
import { formatTime, formatTimeWithMillis } from '../utils/time';

function TimelineControls() {
  const {
    isPlaying,
    setIsPlaying,
    playheadTime,
    videoDuration,
    setPlayheadTime,
    zoomLevel,
    setZoomLevel,
    splitScene,
    splitWord,
    selectedSceneId,
    selectedWordId
  } = useEditorStore();

  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleFastBackward = () => {
    setPlayheadTime(Math.max(0, playheadTime - 10));
  };

  const handleFastForward = () => {
    setPlayheadTime(Math.min(videoDuration, playheadTime + 10));
  };

  const handleZoomIn = () => {
    setZoomLevel(zoomLevel * 1.5);
  };

  const handleZoomOut = () => {
    setZoomLevel(zoomLevel / 1.5);
  };

  const handleSplit = () => {
    if (selectedSceneId) {
      splitScene(selectedSceneId, playheadTime);
    } else if (selectedWordId) {
      splitWord(selectedWordId, playheadTime);
    }
  };

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-3 space-x-3 text-gray-700">
      {/* Navigation buttons */}
      <button className="p-1 text-gray-500 hover:text-gray-700 rounded" title="Previous">
        ⏪
      </button>
      <button className="p-1 text-gray-500 hover:text-gray-700 rounded" title="Next">
        ⏩
      </button>

      {/* Bookmark icon */}
      <button className="p-1 text-gray-500 hover:text-gray-700 rounded" title="Add bookmark">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
        </svg>
      </button>

      {/* Time display */}
      <div className="text-sm font-medium text-gray-900 min-w-[100px]">
        {formatTime(playheadTime)} / {formatTime(videoDuration)}
      </div>

      {/* Record button */}
      <button className="p-1.5 text-red-500 hover:text-red-600 rounded">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" />
        </svg>
      </button>

      {/* Playback controls */}
      <button
        onClick={handlePlayPause}
        className="p-1 text-gray-500 hover:text-gray-700 rounded"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Playback speed */}
      <select
        value={playbackSpeed}
        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
        className="text-xs border border-gray-300 bg-white text-gray-700 rounded px-2 py-1"
      >
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1.0">1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2.0">2x</option>
      </select>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300"></div>

      {/* Split button */}
      <button
        onClick={handleSplit}
        disabled={!selectedSceneId && !selectedWordId}
        className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30"
        title="Split at playhead"
      >
        🔀 Split
      </button>

      <div className="flex-1"></div>

      {/* Zoom controls */}
      <button
        onClick={handleZoomOut}
        className="p-1 text-gray-500 hover:text-gray-700 rounded"
        title="Zoom out"
      >
        −
      </button>

      <span className="text-xs text-gray-600 min-w-[45px] text-center font-medium">
        {Math.round(zoomLevel)}%
      </span>

      <button
        onClick={handleZoomIn}
        className="p-1 text-gray-500 hover:text-gray-700 rounded"
        title="Zoom in"
      >
        +
      </button>

      {/* Layout view buttons */}
      <button className="p-1 text-gray-500 hover:text-gray-700 rounded" title="List view">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </button>

      <button className="p-1 text-gray-500 hover:text-gray-700 rounded" title="Grid view">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
        </svg>
      </button>
    </div>
  );
}

export default TimelineControls;

