import { useState } from 'react';
import useEditorStore from '../store/useEditorStore';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Toolbar() {
  const { project, canUndo, canRedo, undo, redo, updateProject, currentTime } = useEditorStore();
  const [exporting, setExporting] = useState(false);
  const [improving, setImproving] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const navigate = useNavigate();

  const handleUndo = () => {
    if (canUndo()) undo();
  };

  const handleRedo = () => {
    if (canRedo()) redo();
  };

  const handleImproveCaptions = async () => {
    if (!project || !project.transcriptionSegments) return;

    setImproving(true);
    try {
      const captions = project.transcriptionSegments;
      const response = await axios.post('/api/captions/improve', {
        captions,
        style: 'grammar'
      });

      // Update segments with improved text
      const improved = response.data.improved || [];
      const updatedSegments = project.transcriptionSegments.map((seg, idx) => ({
        ...seg,
        text: improved[idx]?.text || seg.text
      }));

      updateProject({
        transcriptionSegments: updatedSegments,
        fullTranscript: updatedSegments.map(s => s.text).join(' ')
      });
    } catch (error) {
      console.error('Failed to improve captions:', error);
      alert('Failed to improve captions: ' + (error.response?.data?.error || error.message));
    } finally {
      setImproving(false);
    }
  };

  const handleExport = async () => {
    if (!project) return;

    setExporting(true);
    try {
      // Save project first
      await axios.put(`/api/project/${project.id}`, project);

      // Prepare export data
      const exportData = {
        projectId: project.id,
        outputOptions: {
          resolution: '1080p',
          codec: 'h264',
          burnCaptions: true,
          exportSubtitles: true
        },
        edits: {
          scenes: project.scenes,
          captions: project.transcriptionSegments
        }
      };

      // Show progress
      setExportProgress('Preparing export...');

      const response = await axios.post('/api/export', exportData, {
        timeout: 300000, // 5 minute timeout for long videos
        onUploadProgress: () => {
          setExportProgress('Rendering video... Please wait (this may take 1-2 minutes)');
        }
      });
      
      if (response.data.success) {
        // Download the file automatically
        const downloadUrl = `http://localhost:3001${response.data.exportUrl}`;
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = response.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setExportProgress('Download starting...');
        setTimeout(() => {
          alert(`✅ Video exported successfully!\n\nFile: ${response.data.fileName}\n\nThe video has been downloaded to your Downloads folder.`);
          setExportProgress('');
        }, 500);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('');
      if (error.code === 'ECONNABORTED') {
        alert('⏱️ Export is taking longer than expected.\n\nThe video may still be rendering. Check:\n- Backend logs for progress\n- backend/exports/ folder for the file');
      } else {
        alert('❌ Failed to export:\n\n' + (error.response?.data?.error || error.message));
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (!project) return;

    try {
      await axios.put(`/api/project/${project.id}`, project);
      alert('Project saved!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddCaption = () => {
    if (!project) return;

    // Find the segment that contains the current time, or create a new one
    const currentSegment = project.transcriptionSegments.find(
      seg => currentTime >= seg.start && currentTime <= seg.end
    );

    if (currentSegment) {
      // Split the segment at current time
      const segments = project.transcriptionSegments.flatMap(seg => {
        if (seg.id === currentSegment.id) {
          return [
            { ...seg, end: currentTime },
            {
              id: `seg-${Date.now()}`,
              start: currentTime,
              end: seg.end,
              speaker: seg.speaker,
              text: '[New Caption]'
            }
          ];
        }
        return [seg];
      });

      updateProject({
        transcriptionSegments: segments,
        fullTranscript: segments.map(s => s.text).join(' ')
      });
    } else {
      // Add new caption segment at current time
      const newSegment = {
        id: `seg-${Date.now()}`,
        start: currentTime,
        end: currentTime + 3, // 3 second default duration
        speaker: null,
        text: '[New Caption]'
      };

      const segments = [...project.transcriptionSegments, newSegment]
        .sort((a, b) => a.start - b.start);

      updateProject({
        transcriptionSegments: segments,
        fullTranscript: segments.map(s => s.text).join(' ')
      });
    }
  };

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-3 space-x-3 shadow-sm">
      {/* Left controls */}
      <button
        onClick={() => navigate('/')}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
        title="Home"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </button>

      <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Menu">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center space-x-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18v18m0-18l10 0a2 2 0 012 2v14a2 2 0 01-2 2h-10" />
        </svg>
        <span>View</span>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <button
        onClick={handleUndo}
        disabled={!canUndo()}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
        title="Undo"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7z" />
        </svg>
      </button>

      <button
        onClick={handleRedo}
        disabled={!canRedo()}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
        title="Redo"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17 7H7v3L3 6l4-4v3h12v6h-2V7z" />
        </svg>
      </button>

      <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Center - Project name */}
      <div className="flex-1 text-center">
        <h1 className="text-sm font-medium text-gray-900">
          {project?.fileName?.replace(/\.[^/.]+$/, '') || 'Untitled Project'}
        </h1>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2">
        <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center space-x-1">
          <span>89</span>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>

        <button className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center space-x-1">
          <span>59</span>
        </button>

        <button className="px-2 py-1 text-xs border border-purple-500 text-purple-600 hover:bg-purple-50 rounded">
          Upgrade
        </button>

        <button className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">+</button>

        <div className="w-6 h-6 bg-purple-600 rounded-full text-white flex items-center justify-center text-xs font-bold">V</div>

        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </button>

        <button
          onClick={handleExport}
          disabled={exporting || !project}
          className="px-3 py-1 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded disabled:opacity-50 flex items-center gap-2"
          title={exportProgress || 'Export video'}
        >
          {exporting && (
            <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
          )}
          {exporting ? (exportProgress || 'Exporting...') : 'Export'}
        </button>

        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </button>

        <button className="w-6 h-6 bg-yellow-600 rounded text-white text-xs flex items-center justify-center font-bold">1</button>
      </div>
    </div>
  );
}

export default Toolbar;

