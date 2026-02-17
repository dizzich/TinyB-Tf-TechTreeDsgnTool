import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useFileSystem } from './useFileSystem';
import { ProjectFile } from '../types';

export const useKeyboardShortcuts = () => {
  const { saveProject, openProject } = useFileSystem();
  const { undo, redo } = useStore.temporal.getState();
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const meta = useStore((state) => state.meta);
  const settings = useStore((state) => state.settings);
  const loadProject = useStore((state) => state.loadProject);
  const setNodes = useStore((state) => state.setNodes);
  const modals = useStore((state) => state.modals);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when modals are open or in input fields
      const isModalOpen = Object.values(modals).some((isOpen) => isOpen);
      const isInInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;

      if (isModalOpen || isInInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + S: Save
      if (modifier && event.key === 's') {
        event.preventDefault();
        const projectData: ProjectFile = {
          version: '1.0',
          meta: { ...meta, updatedAt: new Date().toISOString() },
          settings,
          nodes,
          edges,
        };
        saveProject(projectData);
        return;
      }

      // Ctrl/Cmd + O: Open
      if (modifier && event.key === 'o') {
        event.preventDefault();
        openProject().then((project) => {
          if (project) {
            loadProject(project);
          }
        });
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if (modifier && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
      if (modifier && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
      }

      // Ctrl/Cmd + A: Select all nodes
      if (modifier && event.key === 'a') {
        event.preventDefault();
        const updatedNodes = nodes.map((n) => ({ ...n, selected: true }));
        setNodes(updatedNodes);
        return;
      }

      // Escape: Clear selection
      if (event.key === 'Escape') {
        event.preventDefault();
        const updatedNodes = nodes.map((n) => ({ ...n, selected: false }));
        setNodes(updatedNodes);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    nodes,
    edges,
    meta,
    settings,
    modals,
    saveProject,
    openProject,
    loadProject,
    setNodes,
    undo,
    redo,
  ]);
};
