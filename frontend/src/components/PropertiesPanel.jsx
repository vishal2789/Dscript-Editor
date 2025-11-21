import { useState } from 'react';
import useEditorStore from '../store/useEditorStore';
import BackgroundPickerModal from './BackgroundPickerModal';

function PropertiesPanel() {
  const {
    selectedSceneId,
    scenes,
    layers,
    updateLayer,
    layout,
    setLayout,
    setBackground,
    openSceneDeleteModal
  } = useEditorStore();

  const selectedScene = scenes.find(s => s.id === selectedSceneId);
  const [showLayout, setShowLayout] = useState(false);
  const [showTransitions, setShowTransitions] = useState(true);
  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button className="px-4 py-2 text-xs font-medium text-gray-700 border-b-2 border-blue-500">
          Properties
        </button>
      </div>

      <BackgroundPickerModal
        isOpen={backgroundModalOpen}
        onClose={() => setBackgroundModalOpen(false)}
        initialBackground={selectedScene?.background}
        onApply={(background) => setBackground(selectedSceneId, background)}
      />

      <div className="flex-1 overflow-y-auto">
        {selectedScene ? (
          <div className="p-4 space-y-6">
            {/* Scene Properties */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Scene</h3>
                <button
                  onClick={() => openSceneDeleteModal(selectedSceneId)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition flex items-center gap-1.5"
                  title="Delete scene (or press Delete key)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
              
              {/* Layout */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Layout
                </label>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition bg-white"
                >
                  <optgroup label="Landscape">
                    <option value="16:9">16:9 (Standard)</option>
                    <option value="4:3">4:3</option>
                    <option value="2.35:1">2.35:1 (Cinematic)</option>
                  </optgroup>
                  <optgroup label="Portrait">
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="4:5">4:5 (Instagram)</option>
                  </optgroup>
                  <optgroup label="Square">
                    <option value="1:1">1:1</option>
                  </optgroup>
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Adjusts preview and export aspect ratio.
                </p>
              </div>

              {/* Background */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Background
                </label>
                <button
                  onClick={() => setBackgroundModalOpen(true)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded hover:border-blue-500 flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Effects */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Effects
                </label>
                <button className="w-full px-3 py-2 text-xs border border-gray-300 rounded hover:border-blue-500 flex items-center justify-center">
                  +
                </button>
              </div>

              {/* Transitions */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Transitions
                  </label>
                  <button className="text-xs text-blue-600 hover:text-blue-700">
                    +
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium">IN</span>
                      <span className="text-xs text-gray-600">Smart transition</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium">OUT</span>
                      <span className="text-xs text-gray-600">Crossfade</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      <button className="p-1 hover:bg-gray-200 rounded">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Layers
                  </label>
                  <button className="text-xs text-blue-600 hover:text-blue-700">
                    +
                  </button>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span className="text-xs text-gray-700">T Captions</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={layers.captions.visible}
                      onChange={(e) => updateLayer('captions', { visible: e.target.checked })}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                      </svg>
                      <span className="text-xs text-gray-700">Script</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={layers.script.visible}
                      onChange={(e) => updateLayer('script', { visible: e.target.checked })}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-400 text-sm">
            Select a scene to view properties
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertiesPanel;

