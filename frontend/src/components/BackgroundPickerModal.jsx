import { useState } from 'react';

const backgroundImages = [
  '/assets/backgrounds/bg-01.jpg',
  '/assets/backgrounds/bg-02.jpg',
  '/assets/backgrounds/bg-03.jpg',
  '/assets/backgrounds/bg-04.jpg',
  '/assets/backgrounds/bg-05.jpg',
  '/assets/backgrounds/bg-06.jpg'
];

const solidColors = [
  '#000000',
  '#ffffff',
  '#0f172a',
  '#1d4ed8',
  '#dc2626',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#8b5cf6',
  '#f472b6'
];

function BackgroundPickerModal({ isOpen, onClose, onApply, initialBackground }) {
  const [selection, setSelection] = useState(initialBackground || { type: 'color', value: '#000000' });
  const [activeTab, setActiveTab] = useState(selection?.type === 'image' ? 'images' : 'colors');

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(selection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">Choose background</p>
            <p className="text-sm text-gray-500">Apply to the selected scene only</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex border border-gray-200 rounded-full p-1 bg-gray-50">
            <button
              onClick={() => setActiveTab('images')}
              className={`flex-1 px-4 py-1 text-sm font-medium rounded-full transition ${
                activeTab === 'images' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex-1 px-4 py-1 text-sm font-medium rounded-full transition ${
                activeTab === 'colors' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Solid colors
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'images' ? (
            <div className="grid grid-cols-3 gap-4">
              {backgroundImages.map((src) => (
                <button
                  key={src}
                  onClick={() => setSelection({ type: 'image', value: src })}
                  className={`relative rounded-xl overflow-hidden border-2 transition ${
                    selection.type === 'image' && selection.value === src
                      ? 'border-blue-500 shadow-lg'
                      : 'border-transparent'
                  }`}
                >
                  <img
                    src={src}
                    alt="Background option"
                    className="w-full h-28 object-cover"
                  />
                  {selection.type === 'image' && selection.value === src && (
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-xl pointer-events-none" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-3 mb-5">
                {solidColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelection({ type: 'color', value: color })}
                    className={`h-12 rounded-xl transition border-2 ${
                      selection.type === 'color' && selection.value === color
                        ? 'border-blue-500 shadow-lg'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Custom hex color</p>
                <input
                  type="color"
                  value={selection.type === 'color' ? selection.value : '#000000'}
                  onChange={(e) => setSelection({ type: 'color', value: e.target.value })}
                  className="h-12 w-full rounded-lg border border-gray-200 cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition shadow bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500/50"
          >
            Apply background
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackgroundPickerModal;

