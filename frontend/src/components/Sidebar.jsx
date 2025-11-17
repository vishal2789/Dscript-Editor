import { useState } from 'react';
import PropertiesPanel from './PropertiesPanel';
import AIToolsPanel from './AIToolsPanel';
import LayersPanel from './LayersPanel';

const TABS = [
  { id: 'properties', label: 'Properties', icon: '⚙️', component: PropertiesPanel },
  { id: 'ai-tools', label: 'AI Tools', icon: '🤖', component: AIToolsPanel },
  { id: 'layers', label: 'Layers', icon: '📚', component: LayersPanel }
];

function Sidebar() {
  const [activeTab, setActiveTab] = useState('properties');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || PropertiesPanel;

  return (
    <div className="w-80 h-full flex bg-white border-l border-gray-200">
      {/* Tab Bar */}
      <div className="w-12 border-r border-gray-200 flex flex-col bg-gray-50">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-3 text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={tab.label}
          >
            <span className="text-lg">{tab.icon}</span>
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="flex-1 min-w-0">
        <ActiveComponent />
      </div>
    </div>
  );
}

export default Sidebar;

