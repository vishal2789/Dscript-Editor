import useEditorStore from '../store/useEditorStore';

function SceneDeletionOverlay() {
  const { sceneDeletionStatus } = useEditorStore();
  const { inProgress, message, progress } = sceneDeletionStatus || {};

  if (!inProgress) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-gray-900/90 border border-gray-700 rounded-2xl shadow-2xl px-8 py-6 text-center w-full max-w-sm pointer-events-auto">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <div>
            <p className="text-base font-semibold text-white">Deleting scene</p>
            <p className="text-sm text-gray-300 mt-1">{message || 'This may take a few seconds…'}</p>
          </div>
          <div className="w-full">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
                style={{ width: `${Math.min(progress || 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{Math.round(Math.min(progress || 0, 100))}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SceneDeletionOverlay;

