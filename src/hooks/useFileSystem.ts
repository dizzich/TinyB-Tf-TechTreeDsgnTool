import { useState, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { ProjectFile } from '../types';

export const useFileSystem = () => {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

  const saveProject = useCallback(async (projectData: ProjectFile) => {
    const jsonString = JSON.stringify(projectData, null, 2);

    // Try Native File System API
    if ('showSaveFilePicker' in window) {
      try {
        const handle = fileHandle || await (window as any).showSaveFilePicker({
          types: [{
            description: 'TechTree Studio Project',
            accept: { 'application/json': ['.json'] },
          }],
        });
        
        setFileHandle(handle);
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return;
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

  const openProject = useCallback(async (): Promise<ProjectFile | null> => {
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
        return JSON.parse(text) as ProjectFile;
      } catch (err: any) {
         if (err.name !== 'AbortError') {
            console.error("File Open Error:", err);
         }
         return null;
      }
    }

    // Fallback: This usually requires an input element click.
    // We can programmatically click a hidden input, or just return null and let caller handle fallback UI.
    // Ideally, for fallback, we need to create an input element dynamically.
    
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const text = await file.text();
                try {
                    resolve(JSON.parse(text));
                } catch (e) {
                    console.error("JSON Parse Error", e);
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
