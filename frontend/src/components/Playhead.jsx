import { useMemo } from 'react';
import useEditorStore from '../store/useEditorStore';
import { timeToPixels } from '../utils/time';

function Playhead() {
  const {
    playheadTime,
    zoomLevel,
    videoDuration
  } = useEditorStore();

  const playheadPosition = useMemo(() => {
    return timeToPixels(playheadTime, zoomLevel);
  }, [playheadTime, zoomLevel]);

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-50 pointer-events-none"
      style={{
        left: `${playheadPosition}px`,
        transform: 'translateX(-50%)'
      }}
    >
      {/* Playhead handle */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
      </div>
      
      {/* Playhead line */}
      <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-blue-500"></div>
    </div>
  );
}

export default Playhead;

