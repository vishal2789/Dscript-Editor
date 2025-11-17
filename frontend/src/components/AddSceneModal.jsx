import { useState, useRef } from 'react';
import axios from 'axios';
import useEditorStore from '../store/useEditorStore';
import StockMediaModal from './StockMediaModal';

/**
 * Modal for adding a new scene to the timeline
 * Supports two methods:
 * 1. Upload video from computer
 * 2. Use stock media from Pexels
 */
function AddSceneModal({ isOpen, onClose, project, playheadTime, onSceneAdded }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'stock'
  const [uploading, setUploading] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file || !project) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    setUploading(true);
    try {
      // Upload the video file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post('http://localhost:3001/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedVideoId = uploadResponse.data.uploadId;
      const uploadedVideoPath = uploadResponse.data.filePath;

      // Get the uploaded video duration
      const uploadedDuration = uploadResponse.data.duration || 10; // Default 10s if not available

      // Now add this scene to the current project at playhead position
      const addSceneResponse = await axios.post('http://localhost:3001/api/scenes/add', {
        projectId: project.id,
        insertTime: playheadTime,
        videoPath: uploadedVideoPath,
        videoId: uploadedVideoId,
        duration: uploadedDuration
      });

      if (addSceneResponse.data.success) {
        // Reload project to get updated video and frames
        const projectResponse = await axios.get(`http://localhost:3001/api/project/${project.id}`);
        useEditorStore.getState().setProject(projectResponse.data);
        
        // Update video URL if it changed
        if (projectResponse.data.filePath) {
          useEditorStore.getState().setVideoUrl(
            `http://localhost:3001/uploads/${projectResponse.data.filePath}`
          );
        }
        
        onSceneAdded(addSceneResponse.data.newScene);
        onClose();
      }
    } catch (error) {
      console.error('Error adding scene:', error);
      alert(error.response?.data?.error || 'Failed to add scene');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStockMediaSelect = (stockVideo) => {
    // Close this modal and open stock media modal
    setStockModalOpen(true);
  };

  const handleStockVideoSelected = async (stockVideo) => {
    if (!project) return;

    setUploading(true);
    setStockModalOpen(false); // Close stock modal first
    
    try {
      // Add scene using stock media
      const response = await axios.post('http://localhost:3001/api/scenes/add-stock', {
        projectId: project.id,
        insertTime: playheadTime,
        stockVideoUrl: stockVideo.videoFiles?.[0]?.link || stockVideo.downloadUrl,
        stockVideoDuration: stockVideo.duration || 10
      });

      if (response.data.success) {
        // Reload project to get updated video and frames
        const projectResponse = await axios.get(`http://localhost:3001/api/project/${project.id}`);
        useEditorStore.getState().setProject(projectResponse.data);
        
        // Update video URL if it changed
        if (projectResponse.data.filePath) {
          useEditorStore.getState().setVideoUrl(
            `http://localhost:3001/uploads/${projectResponse.data.filePath}`
          );
        }
        
        onSceneAdded(response.data.newScene);
        onClose();
      }
    } catch (error) {
      console.error('Error adding scene from stock media:', error);
      alert(error.response?.data?.error || 'Failed to add scene from stock media');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Stock Media Modal */}
      {stockModalOpen && (
        <StockMediaModal
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          scene={null} // No existing scene, this is for adding new scene
          onSelectVideo={handleStockVideoSelected}
        />
      )}

      {/* Add Scene Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add New Scene</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                activeTab === 'upload'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload from Computer
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                activeTab === 'stock'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Stock Media
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'upload' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Upload a video file from your computer to add as a new scene at the current playhead position.
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="scene-file-input"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="scene-file-input"
                    className={`cursor-pointer flex flex-col items-center space-y-2 ${
                      uploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      {uploading ? 'Uploading...' : 'Click to select video file'}
                    </span>
                    <span className="text-xs text-gray-500">MP4, MOV, AVI, etc.</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Browse and select stock footage from Pexels to add as a new scene.
                </p>
                <button
                  onClick={handleStockMediaSelect}
                  disabled={uploading}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>{uploading ? 'Processing...' : 'Browse Stock Media'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AddSceneModal;

