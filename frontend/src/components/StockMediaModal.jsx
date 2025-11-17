import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function StockMediaModal({ isOpen, onClose, scene, onSelectVideo }) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockVideos, setStockVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  const searchStockVideos = useCallback(async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      // Calculate scene duration for filtering
      const sceneDuration = scene ? (scene.end - scene.start) : null;
      
      const response = await axios.post('http://localhost:3001/api/stock-media/search', {
        query: query.trim(),
        perPage: 15,
        sceneDuration: sceneDuration // Pass scene duration for filtering
      });
      
      setStockVideos(response.data.videos);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || 'Failed to search stock videos');
    } finally {
      setLoading(false);
    }
  }, [scene]);

  const analyzeScene = useCallback(async () => {
    if (!scene?.thumbnailPath) return;
    
    setAnalyzing(true);
    setError(null);
    try {
      // Calculate scene duration
      const sceneDuration = scene.end - scene.start;
      
      const response = await axios.post('http://localhost:3001/api/stock-media/analyze-scene', {
        thumbnailPath: scene.thumbnailPath,
        sceneDuration: sceneDuration // Pass scene duration for filtering
      });
      
      setSearchQuery(response.data.keywords);
      setStockVideos(response.data.videos);
    } catch (err) {
      console.error('Scene analysis error:', err);
      setError(err.response?.data?.error || 'Failed to analyze scene. Please try manual search.');
    } finally {
      setAnalyzing(false);
    }
  }, [scene]);

  // Auto-analyze scene when modal opens, or show default videos if no scene
  useEffect(() => {
    if (isOpen) {
      if (scene?.thumbnailPath) {
        // If we have a scene with thumbnail, analyze it
        analyzeScene();
      } else {
        // If no scene (opened from Add Scene Modal), show default/trending videos
        searchStockVideos('video footage');
      }
    }
  }, [isOpen, scene, analyzeScene, searchStockVideos]);

  const handlePreview = async (video) => {
    setSelectedVideo(video);
    setLoading(true);
    setError(null);
    
    try {
      // Get the best quality video file
      const videoFiles = video.videoFiles || video.video_files || [];
      
      if (!videoFiles || videoFiles.length === 0) {
        throw new Error('No video files available for this video');
      }
      
      const videoFile = videoFiles[0];
      
      if (!videoFile || !videoFile.link) {
        throw new Error('Video file link not available');
      }
      
      setPreviewUrl(videoFile.link);
    } catch (err) {
      console.error('Preview error:', err);
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = () => {
    if (!selectedVideo) return;
    
    try {
      const videoFiles = selectedVideo.videoFiles || selectedVideo.video_files || [];
      
      if (!videoFiles || videoFiles.length === 0) {
        setError('No video files available for this video');
        return;
      }
      
      const videoFile = videoFiles[0];
      
      if (!videoFile || !videoFile.link) {
        setError('Video file link not available');
        return;
      }
      
      onSelectVideo({
        ...selectedVideo,
        downloadUrl: videoFile.link
      });
      onClose();
    } catch (err) {
      console.error('Error selecting video:', err);
      setError(err.message || 'Failed to select video');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Choose Stock Footage
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Scene {scene?.id} • Duration: {((scene?.end - scene?.start) || 0).toFixed(1)}s
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchStockVideos(searchQuery)}
                placeholder="Try: 'running shoe close-up' or 'leather boot product shot'"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={analyzing}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Tip: Be specific! Use keywords like "shoe", "footwear", "sneaker", "boot" instead of generic terms
              </p>
              {scene && (
                <p className="text-xs text-blue-600 mt-1">
                  ⏱️ Showing videos matching your scene duration: {((scene.end - scene.start) || 0).toFixed(1)}s (±50%)
                </p>
              )}
            </div>
            <button
              onClick={() => searchStockVideos(searchQuery)}
              disabled={loading || analyzing || !searchQuery.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={analyzeScene}
              disabled={analyzing}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              title="Let AI analyze the scene and suggest keywords"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {analyzing ? 'Analyzing...' : 'AI Analyze'}
            </button>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {analyzing ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Analyzing scene with AI...</p>
                </div>
              </div>
            ) : stockVideos.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p>No videos found. Try searching or analyzing the scene.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {stockVideos.map((video) => {
                  const videoFiles = video.videoFiles || video.video_files || [];
                  const hasVideoFiles = videoFiles && videoFiles.length > 0 && videoFiles[0]?.link;
                  
                  return (
                  <div
                    key={video.id}
                    className={`rounded-lg overflow-hidden border-2 transition ${
                      selectedVideo?.id === video.id
                        ? 'border-blue-500 shadow-lg'
                        : hasVideoFiles
                        ? 'border-gray-200 hover:border-blue-300 cursor-pointer'
                        : 'border-gray-200 opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => hasVideoFiles && handlePreview(video)}
                    title={!hasVideoFiles ? 'No video files available' : 'Click to preview'}
                  >
                    <div className="relative aspect-video bg-gray-200">
                      <img
                        src={video.image}
                        alt={`Stock video ${video.id}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {video.duration}s
                      </div>
                      {!hasVideoFiles && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">No video files</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-white">
                      <p className="text-xs text-gray-600 truncate">
                        By {video.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {video.width}x{video.height}
                      </p>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {selectedVideo && (
            <div className="w-96 border-l border-gray-200 bg-gray-50 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Preview</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {previewUrl ? (
                  <div className="space-y-4">
                    <video
                      src={previewUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full rounded-lg"
                    />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{selectedVideo.duration}s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Resolution:</span>
                        <span className="font-medium">{selectedVideo.width}x{selectedVideo.height}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">By:</span>
                        <a
                          href={selectedVideo.user.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {selectedVideo.user.name}
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handleSelectVideo}
                  disabled={!selectedVideo}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                >
                  {scene ? 'Replace Scene with This Video' : 'Add Scene with This Video'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-600">
          Stock videos powered by <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Pexels</a>
        </div>
      </div>
    </div>
  );
}

export default StockMediaModal;

