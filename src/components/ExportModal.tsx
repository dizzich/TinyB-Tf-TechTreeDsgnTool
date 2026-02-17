import React from 'react';
import { X, Image, FileText, Code } from 'lucide-react';
import { useStore } from '../store/useStore';
import { exportToPng, exportToSvg, exportToCsv, exportToNotionCsv, exportToDrawIo } from '../utils/export';

export const ExportModal = () => {
  const isOpen = useStore((state) => state.modals.export);
  // I need to add 'export' to modals in store
  const setModalOpen = useStore((state) => state.setModalOpen);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[400px] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Экспорт проекта</h2>
          <button onClick={() => setModalOpen('export', false)} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
           <button
             onClick={() => exportToPng()}
             className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition"
           >
             <Image size={32} className="text-blue-500 mb-2" />
             <span className="text-sm font-medium">PNG изображение</span>
           </button>

           <button
             onClick={() => exportToSvg()}
             className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition"
           >
             <Code size={32} className="text-green-500 mb-2" />
             <span className="text-sm font-medium">SVG вектор</span>
           </button>

           <button
             onClick={() => exportToCsv(nodes, edges)}
             className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition"
           >
             <FileText size={32} className="text-orange-500 mb-2" />
             <span className="text-sm font-medium">CSV данные</span>
           </button>

           <button
             onClick={() => exportToNotionCsv(nodes, edges)}
             className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition"
           >
             <FileText size={32} className="text-purple-500 mb-2" />
             <span className="text-sm font-medium">CSV Notion</span>
           </button>

           <button
             onClick={() => exportToDrawIo(nodes, edges)}
             className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50 transition"
           >
             <div className="w-8 h-8 bg-orange-600 rounded mb-2 flex items-center justify-center text-white text-xs font-bold">d</div>
             <span className="text-sm font-medium">Draw.io XML</span>
           </button>
        </div>
      </div>
    </div>
  );
};
