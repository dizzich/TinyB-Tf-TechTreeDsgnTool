import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { Graph } from './graph/Graph';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { StartupModal } from './components/StartupModal';
import { NotionSyncModal } from './components/NotionSyncModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotionAutoSave } from './hooks/useNotionAutoSave';

function App() {
  useKeyboardShortcuts();
  useNotionAutoSave();

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen bg-white text-gray-900 overflow-hidden font-sans">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <div className="flex-1 relative">
            <Graph />
          </div>
          <Inspector />
        </div>
        <ImportModal />
        <ExportModal />
        <SettingsModal />
        <StartupModal />
        <NotionSyncModal />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
