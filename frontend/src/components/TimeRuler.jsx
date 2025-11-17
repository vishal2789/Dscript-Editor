import { useMemo } from 'react';
import useEditorStore from '../store/useEditorStore';
import { formatTime, timeToPixels } from '../utils/time';

function TimeRuler() {
  const { videoDuration, zoomLevel } = useEditorStore();

  // Generate time markers based on zoom level
  const timeMarkers = useMemo(() => {
    if (!videoDuration || videoDuration <= 0) return [];

    // Determine marker interval based on zoom level
    let interval = 1; // Default 1 second
    
    if (zoomLevel < 50) {
      interval = 5; // 5 seconds for zoomed out
    } else if (zoomLevel < 100) {
      interval = 2; // 2 seconds for medium zoom
    } else if (zoomLevel >= 100) {
      interval = 1; // 1 second for zoomed in
    }

    const markers = [];
    for (let time = 0; time <= videoDuration; time += interval) {
      markers.push({
        time,
        position: timeToPixels(time, zoomLevel),
        label: formatTime(time)
      });
    }

    return markers;
  }, [videoDuration, zoomLevel]);

  return (
    <div className="h-6 bg-gray-900 border-b border-gray-700 relative flex-shrink-0">
      {timeMarkers.map((marker) => (
        <div
          key={marker.time}
          className="absolute text-xs text-gray-400"
          style={{
            left: `${marker.position}px`,
            top: '2px'
          }}
        >
          <div className="relative">
            {/* Tick mark */}
            <div className="w-px h-2 bg-gray-600 absolute left-0 top-3" />
            {/* Time label */}
            <span className="pl-1">{marker.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TimeRuler;

