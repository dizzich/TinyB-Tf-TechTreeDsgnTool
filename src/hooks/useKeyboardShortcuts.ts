import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useFileSystem } from './useFileSystem';
import { ProjectFile } from '../types';

const doUndo = () => {
  const temporal = useStore.temporal.getState();
  temporal.pause();
  temporal.undo();
  temporal.resume();
  const { nodes } = useStore.getState();
  useStore.getState().markNodesDirty(nodes.map((n) => n.id));
};

const doRedo = () => {
  const temporal = useStore.temporal.getState();
  temporal.pause();
  temporal.redo();
  temporal.resume();
  const { nodes } = useStore.getState();
  useStore.getState().markNodesDirty(nodes.map((n) => n.id));
};

export const useKeyboardShortcuts = () => {
  const { saveProject, openProject } = useFileSystem();
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const meta = useStore((state) => state.meta);
  const settings = useStore((state) => state.settings);
  const notionFieldColors = useStore((state) => state.notionFieldColors);
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
          notionFieldColors: Object.keys(notionFieldColors).length > 0 ? notionFieldColors : undefined,
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
        doUndo();
        return;
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
      if (modifier && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        doRedo();
        return;
      }

      // Ctrl/Cmd + A: Select all nodes (no undo entry)
      if (modifier && event.key === 'a') {
        event.preventDefault();
        const t = useStore.temporal.getState();
        t.pause();
        const updatedNodes = nodes.map((n) => ({ ...n, selected: true }));
        setNodes(updatedNodes);
        t.resume();
        return;
      }

      // Escape: Clear selection (no undo entry)
      if (event.key === 'Escape') {
        event.preventDefault();
        const t = useStore.temporal.getState();
        t.pause();
        const updatedNodes = nodes.map((n) => ({ ...n, selected: false }));
        setNodes(updatedNodes);
        t.resume();
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
  ]);
};
