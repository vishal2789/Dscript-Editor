import { useMemo, useState, useRef } from 'react';
import useEditorStore from '../store/useEditorStore';
import { timeToPixels } from '../utils/time';
import { formatTime } from '../utils/time';
import StockMediaModal from './StockMediaModal';
import AddSceneModal from './AddSceneModal';
import axios from 'axios';

function SceneTrack() {
  const {
    scenes,
    playheadTime,
    zoomLevel,
    selectedSceneId,
    selectScene,
    setPlayheadTime,
    project,
    setVideoUrl,
    setProject
  } = useEditorStore();
  
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedSceneForStock, setSelectedSceneForStock] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [addSceneModalOpen, setAddSceneModalOpen] = useState(false);
  
  // ✅ FIX: Request versioning to prevent async update conflicts
  const requestVersionRef = useRef(0);
  const abortControllerRef = useRef(null);
  
  const { addScene } = useEditorStore();

  // Get frames from project
  const frames = project?.frames || [];

  // Debug logging
  console.log('SceneTrack - Total frames available:', frames.length);
  console.log('SceneTrack - Scenes:', scenes?.length);
  console.log('SceneTrack - Sample frame paths:', frames.slice(0, 3).map(f => f.path));

  const scenesWithPixels = useMemo(() => {
    if (!scenes || scenes.length === 0) return [];
    
    // ✅ FIX: Create a fresh array reference to ensure React detects changes
    return scenes.map((scene, idx) => {
      // ✅ FIX: Use strict filtering - prioritize sceneId matching for replaced scenes
      const sceneFrames = frames
        .filter(frame => {
          // Priority 1: If frame has sceneId metadata, use that (for replaced scenes)
          if (frame.sceneId) {
            return frame.sceneId === scene.id;
          }
          
          // Priority 2: If frame path contains scene-specific folder
          if (frame.path?.includes(`/${scene.id}/`)) {
            return true;
          }
          
          // Priority 3: Time-based filtering with STRICT boundaries (for old frames without sceneId)
          // Use >= start and < end to avoid overlap
          // Add small epsilon for floating point comparison
          const epsilon = 0.01; // 10ms tolerance
          return frame.time >= (scene.start - epsilon) && frame.time < (scene.end - epsilon);
        })
        .map(frame => ({ ...frame })); // ✅ FIX: Create new frame object references
      
      // ✅ FIX: Sort frames by time to ensure consistent ordering
      sceneFrames.sort((a, b) => a.time - b.time);
      
      console.log(`Scene ${scene.id} (${idx}): ${scene.start}s-${scene.end}s, Frames: ${sceneFrames.length}`);
      if (sceneFrames.length > 0) {
        console.log(`  First frame: time=${sceneFrames[0].time}s, path=${sceneFrames[0].path}`);
        console.log(`  Last frame: time=${sceneFrames[sceneFrames.length - 1].time}s, path=${sceneFrames[sceneFrames.length - 1].path}`);
      }
      
      // ✅ FIX: Create new scene object with new frames array reference
      return {
        ...scene,
        left: timeToPixels(scene.start, zoomLevel),
        width: timeToPixels(scene.end - scene.start, zoomLevel),
        frames: sceneFrames // ✅ FIX: New array reference
      };
    });
  }, [scenes, zoomLevel, frames]);

  const handleChooseStockFootage = (scene, e) => {
    e.stopPropagation();
    setSelectedSceneForStock(scene);
    setStockModalOpen(true);
  };

  const handleSelectStockVideo = async (stockVideo) => {
    if (!project || !selectedSceneForStock) return;
    
    // ✅ FIX: Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // ✅ FIX: Increment request version to track this specific request
    const currentVersion = ++requestVersionRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setReplacing(true);
    try {
      const response = await axios.post('http://localhost:3001/api/stock-media/replace-scene', {
        projectId: project.id,
        sceneId: selectedSceneForStock.id,
        stockVideoUrl: stockVideo.downloadUrl,
        sceneStart: selectedSceneForStock.start,
        sceneEnd: selectedSceneForStock.end
      }, {
        signal: abortController.signal // ✅ FIX: Add abort signal
      });
      
      // ✅ FIX: Check if this is still the latest request (prevent race conditions)
      if (currentVersion !== requestVersionRef.current) {
        console.log('Ignoring stale response from scene replacement');
        return;
      }
      
      // Close modal first
      setStockModalOpen(false);
      setSelectedSceneForStock(null);
      
      // ✅ FIX: Reload project data from server instead of full page reload
      // Fetch updated project data
      const projectResponse = await axios.get(`http://localhost:3001/api/project/${project.id}`, {
        signal: abortController.signal
      });
      
      // ✅ FIX: Check again if this is still the latest request
      if (currentVersion !== requestVersionRef.current) {
        console.log('Ignoring stale project data');
        return;
      }
      
      // ✅ FIX: Update project state with fresh data (this will trigger React re-render)
      setProject(projectResponse.data);
      
      // ✅ FIX: Update video URL if it changed
      if (projectResponse.data.filePath) {
        useEditorStore.getState().setVideoUrl(
          `http://localhost:3001/uploads/${projectResponse.data.filePath}`
        );
      }
      
      // Show success message
      alert('Scene replaced successfully!');
    } catch (error) {
      // ✅ FIX: Don't show error if request was aborted
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('Scene replacement request was cancelled');
        return;
      }
      
      // ✅ FIX: Only show error if this is still the latest request
      if (currentVersion === requestVersionRef.current) {
        console.error('Scene replacement error:', error);
        alert(error.response?.data?.error || 'Failed to replace scene');
      }
    } finally {
      // ✅ FIX: Only update state if this is still the latest request
      if (currentVersion === requestVersionRef.current) {
        setReplacing(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleSceneAdded = (newScene) => {
    addScene(newScene);
    // Optionally select the new scene
    useEditorStore.getState().selectScene(newScene.id);
  };

  return (
    <>
      <StockMediaModal
        isOpen={stockModalOpen}
        onClose={() => {
          setStockModalOpen(false);
          setSelectedSceneForStock(null);
        }}
        scene={selectedSceneForStock}
        onSelectVideo={handleSelectStockVideo}
      />
      <AddSceneModal
        isOpen={addSceneModalOpen}
        onClose={() => setAddSceneModalOpen(false)}
        project={project}
        playheadTime={playheadTime}
        onSceneAdded={handleSceneAdded}
      />
    <div className="h-20 bg-gray-900 border-b border-gray-700 relative overflow-hidden flex-shrink-0">
      {/* Add Scene Button */}
      <div className="absolute top-2 left-2 z-40">
        <button
          onClick={() => setAddSceneModalOpen(true)}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded shadow-lg transition flex items-center gap-1.5"
          title="Add new scene at playhead position"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Scene</span>
        </button>
      </div>
      <div className="relative h-full w-full flex items-center">
        {scenesWithPixels.map((scene, idx) => {
          const isSelected = selectedSceneId === scene.id;
          const isPlayheadInScene = playheadTime >= scene.start && playheadTime <= scene.end;
          
          // Calculate scene duration and frame count
          const sceneDuration = scene.end - scene.start;
          const estimatedFrameCount = Math.ceil(sceneDuration / 0.5); // 0.5s per frame
          
          // Always show ALL frames based on duration (maximum 50 for very long scenes)
          const maxFrames = 50;
          const displayFrameCount = Math.min(estimatedFrameCount, maxFrames);
          
          // Calculate frame width to fit all frames in scene width
          // Minimum 25px per frame so frames are always visible
          const calculatedFrameWidth = scene.width / displayFrameCount;
          const minFrameWidth = 25;
          const actualFrameWidth = Math.max(calculatedFrameWidth, minFrameWidth);
          
          console.log(`Scene ${idx + 1}: left=${scene.left}px, width=${scene.width}px, duration=${sceneDuration}s, estimatedFrames=${estimatedFrameCount}, displayFrames=${displayFrameCount}, frameWidth=${actualFrameWidth.toFixed(1)}px`);

          return (
            <div
              key={scene.id}
              className={`absolute flex overflow-hidden cursor-pointer border-t-2 border-b-2 border-r-2 ${
                isSelected
                  ? 'border-blue-500'
                  : isPlayheadInScene
                  ? 'border-blue-300'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
              style={{
                left: `${scene.left}px`,
                width: `${scene.width}px`,
                height: '68px',
                top: '6px',
                boxSizing: 'border-box'
              }}
              onClick={() => {
                selectScene(scene.id);
                setPlayheadTime(scene.start);
              }}
              title={`Scene ${idx + 1}: ${formatTime(scene.start)} - ${formatTime(scene.end)}`}
            >
              {/* Filmstrip frames */}
              {(() => {
                // Always generate frames based on duration, not available frame count
                // This ensures consistent display regardless of extraction interval
                console.log(`Rendering ${displayFrameCount} frames for scene ${scene.id} (duration: ${sceneDuration}s, availableFrames: ${scene.frames?.length || 0})`);
                
                return Array.from({ length: displayFrameCount }, (_, frameIdx) => {
                  // Calculate the expected time for this frame slot
                  const frameTime = scene.start + (frameIdx / displayFrameCount) * sceneDuration;
                  
                  // Find the closest real frame that belongs to this scene's time range
                  let imageUrl = scene.thumbnailPath; // Default to thumbnail
                  let cacheBust = scene.thumbnailCacheBust || null;
                  let frameId = `scene-${scene.id}-frame-${frameIdx}`; // ✅ FIX: Fallback ID
                  
                  if (scene.frames && scene.frames.length > 0) {
                    // Only use frames that are strictly within this scene's time range
                    const validFrames = scene.frames.filter(
                      f => f.time >= scene.start && f.time < scene.end
                    );
                    
                    if (validFrames.length > 0) {
                      // Find closest frame to this time slot
                      const closestFrame = validFrames.reduce((prev, curr) => {
                        const prevDiff = Math.abs(prev.time - frameTime);
                        const currDiff = Math.abs(curr.time - frameTime);
                        return currDiff < prevDiff ? curr : prev;
                      });
                      imageUrl = closestFrame.path;
                      cacheBust = closestFrame.cacheBust || scene.thumbnailCacheBust || null;
                      // ✅ FIX: Use frame's unique ID if available, otherwise generate one
                      frameId = closestFrame.id || `scene-${scene.id}-frame-${frameIdx}-${closestFrame.time}`;
                    }
                  }
                  
                  // ✅ FIX: Build image URL with cache busting only when timestamp available
                  const imageUrlWithCache = cacheBust 
                    ? `http://localhost:3001${imageUrl}?t=${cacheBust}`
                    : `http://localhost:3001${imageUrl}`;
                  
                  return (
                    <div
                      key={frameId} // ✅ FIX: Use unique frame ID instead of index
                      className="relative flex-shrink-0"
                      style={{
                        width: `${actualFrameWidth}px`,
                        height: '68px',
                        borderRight: frameIdx < displayFrameCount - 1 ? '1px solid rgba(55, 65, 81, 0.3)' : 'none'
                      }}
                    >
                      {imageUrl ? (
                        <img
                          key={`img-${frameId}-${cacheBust || 'static'}`}
                          src={imageUrlWithCache}
                          alt={`Scene ${idx + 1} - Frame ${frameIdx + 1}`}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'crisp-edges' }}
                          onError={(e) => {
                            console.error(`Failed to load frame: ${imageUrl}`);
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <span className="text-xs text-white font-medium">{frameIdx + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Scene number badge */}
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-black/80 text-white text-xs font-bold flex items-center justify-center rounded-sm z-20 pointer-events-none">
                {idx + 1}
              </div>

              {/* Stock Footage Button - Shows for all scenes */}
              <div className="absolute top-0.5 right-0.5 z-30">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChooseStockFootage(scene, e);
                  }}
                  disabled={replacing}
                  className={`px-2 py-1 text-white text-xs rounded shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 pointer-events-auto ${
                    isSelected 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-purple-700/80 hover:bg-purple-600 opacity-80 hover:opacity-100'
                  }`}
                  title="Replace with stock footage"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span>{replacing && selectedSceneForStock?.id === scene.id ? 'Replacing...' : 'Stock Media'}</span>
                </button>
              </div>

              {/* Trim handles - with pointer-events-auto */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 hover:bg-blue-400 cursor-col-resize opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-auto" title="Trim start" />
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 hover:bg-blue-400 cursor-col-resize opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-auto" title="Trim end" />
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}

export default SceneTrack;

