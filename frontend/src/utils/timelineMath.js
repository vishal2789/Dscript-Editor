/**
 * Timeline math utilities for zoom, scroll, and positioning
 */

/**
 * Calculate timeline width based on duration and zoom
 */
export function calculateTimelineWidth(duration, zoomLevel) {
  return duration * zoomLevel;
}

/**
 * Get visible time range based on scroll position and container width
 */
export function getVisibleTimeRange(scrollLeft, containerWidth, zoomLevel) {
  const startTime = scrollLeft / zoomLevel;
  const endTime = (scrollLeft + containerWidth) / zoomLevel;
  return { startTime, endTime };
}

/**
 * Snap time to nearest grid point
 */
export function snapToGrid(time, gridSize = 0.1) {
  return Math.round(time / gridSize) * gridSize;
}

/**
 * Calculate optimal zoom level to fit duration in container
 */
export function calculateFitZoom(duration, containerWidth, padding = 100) {
  return (containerWidth - padding) / duration;
}

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

