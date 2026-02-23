import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { ProjectFile } from '../types';

export const useFileSystem = () => {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

  const saveProject = useCallback(async (projectData: ProjectFile, forceNew = false): Promise<{ fileName: string } | undefined> => {
    const jsonString = JSON.stringify(projectData, null, 2);

    // Try Native File System API
    if ('showSaveFilePicker' in window) {
      try {
        let handle = fileHandle;
        if (forceNew || !handle) {
          handle = await (window as any).showSaveFilePicker({
            types: [{
              description: 'TechTree Studio Project',
              accept: { 'application/json': ['.json'] },
            }],
          });
        }
        if (!handle) {
          throw new Error('No file handle obtained');
        }

        setFileHandle(handle);
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return { fileName: handle.name };
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('File Save Error:', err);
          // Fallback if user cancels or API fails weirdly
        } else {
          return; // User cancelled
        }
      }
    }

    // Fallback
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `${projectData.meta.name || 'project'}.json`);
  }, [fileHandle]);

  const openProject = useCallback(async (): Promise<{ project: ProjectFile; fileName: string | null } | null> => {
    // Try Native File System API
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'TechTree Studio Project',
            accept: { 'application/json': ['.json'] },
          }],
          multiple: false,
        });

        setFileHandle(handle);
        const file = await handle.getFile();
        const text = await file.text();
        const project = JSON.parse(text) as ProjectFile;
        return { project, fileName: handle.name ?? null };
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('File Open Error:', err);
        }
        return null;
      }
    }

    // Fallback: input element
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const text = await file.text();
          try {
            const project = JSON.parse(text) as ProjectFile;
            resolve({ project, fileName: file.name ?? null });
          } catch (err) {
            console.error('JSON Parse Error', err);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }, []);

  return { saveProject, openProject, hasHandle: !!fileHandle };
};
