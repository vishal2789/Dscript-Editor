import useEditorStore from '../store/useEditorStore';

function LayersPanel() {
  const { project, layers, updateLayer } = useEditorStore();

  if (!project) {
    return (
      <div className="flex-1 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Layers</h3>
        <p className="text-sm text-gray-500">No project loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button className="px-4 py-2 text-xs font-medium text-gray-700 border-b-2 border-blue-500">
          Layers
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Layers</h3>

        <div className="space-y-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Video Track</span>
              <span className="text-xs text-gray-500">Locked</span>
            </div>
            <p className="text-xs text-gray-600">{project?.fileName || 'No video'}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Captions</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {project?.transcriptionSegments?.length || 0} segments
                </span>
                <input
                  type="checkbox"
                  checked={layers.captions.visible}
                  onChange={(e) => updateLayer('captions', { visible: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">Auto-generated from transcript</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Script</span>
              <input
                type="checkbox"
                checked={layers.script.visible}
                onChange={(e) => updateLayer('script', { visible: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <p className="text-xs text-gray-600">Transcript text layer</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Scenes</span>
              <span className="text-xs text-gray-500">
                {project?.scenes?.length || 0} scenes
              </span>
            </div>
            <p className="text-xs text-gray-600">Auto-detected</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded">
            + Add Overlay
          </button>
        </div>
      </div>
    </div>
  );
}

export default LayersPanel;

