/**
 * Time formatting utilities
 */

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatTimeWithMillis(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00.000';
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${minutes}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function parseTime(timeString) {
  // Parse "M:SS" or "H:MM:SS" format
  const parts = timeString.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function timeToPixels(time, zoomLevel) {
  return time * zoomLevel;
}

export function pixelsToTime(pixels, zoomLevel) {
  return pixels / zoomLevel;
}

