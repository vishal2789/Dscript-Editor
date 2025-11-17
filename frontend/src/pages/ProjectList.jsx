import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ProjectList() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });

      navigate(`/editor/${response.data.uploadId}`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Dscript Editor
          </h1>
          <p className="text-xl text-gray-600">
            Transcript-first video editing, powered by AI
          </p>
        </div>

        <div
          className={`max-w-2xl mx-auto border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-white hover:border-primary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="video/*,audio/*"
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
            disabled={uploading}
          />
          
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              {uploading ? 'Uploading and processing...' : 'Upload Video or Audio'}
            </h3>
            <p className="text-gray-600 mb-6">
              Drag and drop your file here, or click to browse
            </p>
            <button
              className="btn btn-primary"
              disabled={uploading}
              onClick={() => document.getElementById('file-upload').click()}
            >
              {uploading ? 'Processing...' : 'Choose File'}
            </button>
          </label>
        </div>

        {uploading && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                This may take a few minutes. We're transcribing your audio and detecting scenes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectList;

