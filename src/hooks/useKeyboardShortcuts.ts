import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useFileSystem } from './useFileSystem';
import { ProjectFile } from '../types';
import { nodeMatchesRules } from '../utils/filterUtils';

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
  const canvasFilter = useStore((state) => state.canvasFilter);
  const setShiftKeyPressed = useStore((state) => state.setShiftKeyPressed);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKeyPressed(true);
      }
      // Don't trigger shortcuts when modals are open or in input fields
      const isModalOpen = Object.values(modals).some((isOpen) => isOpen);
      const isInInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;

      if (isModalOpen || isInInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Use event.code for layout-independent keys (works with any keyboard layout)
      const code = event.code;

      // Ctrl/Cmd + S: Save
      if (modifier && code === 'KeyS') {
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
      if (modifier && code === 'KeyO') {
        event.preventDefault();
        openProject().then((project) => {
          if (project) {
            loadProject(project);
          }
        });
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if (modifier && code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault();
        useStore.getState().undo();
        return;
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
      if (modifier && (code === 'KeyY' || (code === 'KeyZ' && event.shiftKey))) {
        event.preventDefault();
        useStore.getState().redo();
        return;
      }

      // Ctrl/Cmd + A: Select all nodes; when canvas filter is on with rules, only nodes passing the filter (dimmed not selected)
      if (modifier && code === 'KeyA') {
        event.preventDefault();
        const useFilter = canvasFilter.enabled && (canvasFilter.rules?.length ?? 0) > 0;
        const rules = canvasFilter.rules ?? [];
        const updatedNodes = nodes.map((n) => ({
          ...n,
          selected: useFilter ? nodeMatchesRules(n, rules) : true,
        }));
        setNodes(updatedNodes);
        return;
      }

      // Escape: Clear selection (no undo entry)
      if (code === 'Escape') {
        event.preventDefault();
        const updatedNodes = nodes.map((n) => ({ ...n, selected: false }));
        setNodes(updatedNodes);
        return;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKeyPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    nodes,
    edges,
    meta,
    settings,
    modals,
    notionFieldColors,
    canvasFilter,
    saveProject,
    openProject,
    loadProject,
    setNodes,
    setShiftKeyPressed,
  ]);
};
