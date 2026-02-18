import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Inspector } from './components/Inspector';
import { Graph } from './graph/Graph';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { ColorMappingModal } from './components/ColorMappingModal';
import { StartupModal } from './components/StartupModal';
import { NotionSyncModal } from './components/NotionSyncModal';
import { StatusBar } from './components/StatusBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotionAutoSave } from './hooks/useNotionAutoSave';
import { useNotionPullOnFocus } from './hooks/useNotionPullOnFocus';
import { useNotionPolling } from './hooks/useNotionPolling';
import { useStore } from './store/useStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function App() {
  useKeyboardShortcuts();
  useNotionAutoSave();
  useNotionPullOnFocus();
  useNotionPolling();

  const theme = useStore((state) => state.ui.theme);
  const sidebarOpen = useStore((state) => state.ui.sidebarOpen);
  const inspectorOpen = useStore((state) => state.ui.inspectorOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const toggleInspector = useStore((state) => state.toggleInspector);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  return (
    <ReactFlowProvider>
      <div
        id="app"
        className="relative flex h-screen w-screen overflow-hidden text-text bg-bg transition-all duration-300 ease-in-out"
      >
        {/* Workspace fills the screen; panels overlay on top for glass effect */}
        <div className="workspace flex-1 min-w-0 flex flex-col bg-workspace-bg relative z-0">
          {!sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-6 h-12 bg-panel border-y border-r border-panel-border rounded-r-lg shadow-md text-muted hover:text-text hover:bg-panel-2 transition-all"
              title="Показать сайдбар"
            >
              <ChevronRight size={16} />
            </button>
          )}
          
          {!inspectorOpen && (
            <button
              onClick={toggleInspector}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-6 h-12 bg-panel border-y border-l border-panel-border rounded-l-lg shadow-md text-muted hover:text-text hover:bg-panel-2 transition-all"
              title="Показать инспектор"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          <div className="flex-1 min-h-0 relative">
            <Graph />
          </div>
          <StatusBar />
        </div>

        {sidebarOpen && (
          <>
            <div
              className="sidebar-resizer absolute top-0 bottom-0 z-30 w-2 cursor-col-resize bg-panel-border hover:bg-accent/30 transition-colors"
              style={{ left: 'var(--sidebar-width)' }}
            />
            <div className="absolute left-0 top-0 bottom-0 z-20" style={{ width: 'var(--sidebar-width)' }}>
              <Sidebar />
            </div>
          </>
        )}

        {inspectorOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-20 w-80">
            <Inspector />
          </div>
        )}

        <div
          className="absolute top-0 z-30 transition-[left,right] duration-300 ease-in-out"
          style={{
            left: sidebarOpen ? 'var(--sidebar-width)' : 0,
            right: inspectorOpen ? '20rem' : 0,
          }}
        >
          <Toolbar />
        </div>
      </div>
      <ImportModal />
      <ExportModal />
      <SettingsModal />
      <ColorMappingModal />
      <StartupModal />
      <NotionSyncModal />
    </ReactFlowProvider>
  );
}

export default App;
