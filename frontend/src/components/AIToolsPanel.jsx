import { useState } from 'react';
import useEditorStore from '../store/useEditorStore';
import axios from 'axios';

function AIToolsPanel() {
  const {
    project,
    selectedTextRange,
    words,
    updateProject,
    segments
  } = useEditorStore();

  const [improving, setImproving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const getSelectedText = () => {
    if (!selectedTextRange || !words) return '';
    
    const selectedWords = (words || []).filter(w => 
      w.id >= selectedTextRange.startWordId && 
      w.id <= selectedTextRange.endWordId
    );
    return selectedWords.map(w => w.text).join(' ');
  };

  const handleImproveCaptions = async () => {
    if (!project || !segments) return;

    setImproving(true);
    try {
      const captions = segments;
      const response = await axios.post('/api/captions/improve', {
        captions,
        style: 'grammar'
      });

      const improved = response.data.improved || [];
      const updatedSegments = segments.map((seg, idx) => ({
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

  const handleTranslate = async () => {
    // Placeholder for translation feature
    alert('Translation feature coming soon!');
  };

  const handleRegenerate = async () => {
    // Placeholder for regeneration feature
    alert('Regenerate feature coming soon!');
  };

  const handleRewrite = async () => {
    const selectedText = getSelectedText();
    if (!selectedText) {
      alert('Please select text to rewrite');
      return;
    }

    // Placeholder for rewrite feature
    alert('Rewrite feature coming soon!');
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button className="px-4 py-2 text-xs font-medium text-gray-700 border-b-2 border-blue-500">
          AI Tools
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Improve Captions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Improve Captions</h3>
            <p className="text-xs text-gray-600 mb-3">
              Fix grammar and improve clarity of all captions
            </p>
            <button
              onClick={handleImproveCaptions}
              disabled={improving || !project}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {improving ? 'Improving...' : '✨ Improve All Captions'}
            </button>
          </div>

          {/* Translate Script */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Translate Script</h3>
            <p className="text-xs text-gray-600 mb-3">
              Translate the entire script to another language
            </p>
            <button
              onClick={handleTranslate}
              disabled={!project}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              🌐 Translate
            </button>
          </div>

          {/* Regenerate Scene */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Regenerate Scene</h3>
            <p className="text-xs text-gray-600 mb-3">
              Regenerate text for selected scene
            </p>
            <button
              onClick={handleRegenerate}
              disabled={!project}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              🔄 Regenerate
            </button>
          </div>

          {/* Rewrite Selected */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Rewrite Selected</h3>
            <p className="text-xs text-gray-600 mb-3">
              Rewrite the selected text block
            </p>
            <button
              onClick={handleRewrite}
              disabled={!selectedTextRange}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              ✏️ Rewrite Selected
            </button>
            {selectedTextRange && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
                Selected: "{getSelectedText().substring(0, 50)}..."
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIToolsPanel;

