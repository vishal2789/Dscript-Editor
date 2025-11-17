import useEditorStore from '../store/useEditorStore';

function InspectorPanel() {
  const { project, selectedSegmentId, selectedSceneId } = useEditorStore();

  const selectedSegment = project?.transcriptionSegments?.find(
    s => s.id === selectedSegmentId
  );
  const selectedScene = project?.scenes?.find(s => s.id === selectedSceneId);

  const selectedItem = selectedSegment || selectedScene;

  if (!selectedItem) {
    return (
      <div className="h-1/2 border-b border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Inspector</h3>
        <p className="text-sm text-gray-500">Select a segment or scene to view properties</p>
      </div>
    );
  }

  return (
    <div className="h-1/2 border-b border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Inspector</h3>

        <div className="space-y-4">
          {selectedSegment && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Text
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedSegment.text}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Time Range
                </label>
                <p className="text-sm text-gray-600">
                  {formatTime(selectedSegment.start)} - {formatTime(selectedSegment.end)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {formatTime(selectedSegment.end - selectedSegment.start)}
                </p>
              </div>

              {selectedSegment.speaker && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Speaker
                  </label>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: getSpeakerColor(selectedSegment.speaker)
                      }}
                    ></div>
                    <span className="text-sm text-gray-600">
                      Speaker {selectedSegment.speaker}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {selectedScene && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Scene Time Range
                </label>
                <p className="text-sm text-gray-600">
                  {formatTime(selectedScene.start)} - {formatTime(selectedScene.end)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {formatTime(selectedScene.end - selectedScene.start)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getSpeakerColor(speakerId) {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  ];
  return colors[parseInt(speakerId) % colors.length];
}

export default InspectorPanel;

