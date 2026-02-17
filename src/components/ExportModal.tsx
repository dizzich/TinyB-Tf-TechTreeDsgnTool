import React from 'react';
import { X, Image, FileText, Code } from 'lucide-react';
import { useStore } from '../store/useStore';
import { exportToPng, exportToSvg, exportToCsv, exportToNotionCsv, exportToDrawIo } from '../utils/export';

const cardClass =
  'flex flex-col items-center justify-center p-4 border border-control-border rounded-control bg-control-bg hover:bg-control-hover-bg hover:border-control-hover-border hover:-translate-y-0.5 hover:shadow-floating transition-all cursor-pointer text-text';

export const ExportModal = () => {
  const isOpen = useStore((state) => state.modals.export);
  const setModalOpen = useStore((state) => state.setModalOpen);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'var(--modal-overlay)' }}
    >
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-[400px] flex flex-col">
        <div className="modal__header p-4 border-b border-panel-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text uppercase tracking-wider">Экспорт проекта</h2>
          <button
            type="button"
            onClick={() => setModalOpen('export', false)}
            className="w-9 h-9 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-control-hover-border"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="modal__content p-6 grid grid-cols-2 gap-4">
          <button type="button" onClick={() => exportToPng()} className={cardClass}>
            <Image size={32} className="text-accent mb-2" strokeWidth={1.75} />
            <span className="text-sm font-medium">PNG изображение</span>
          </button>

          <button type="button" onClick={() => exportToSvg()} className={cardClass}>
            <Code size={32} className="text-accent mb-2" strokeWidth={1.75} />
            <span className="text-sm font-medium">SVG вектор</span>
          </button>

          <button type="button" onClick={() => exportToCsv(nodes, edges)} className={cardClass}>
            <FileText size={32} className="text-accent mb-2" strokeWidth={1.75} />
            <span className="text-sm font-medium">CSV данные</span>
          </button>

          <button type="button" onClick={() => exportToNotionCsv(nodes, edges)} className={cardClass}>
            <FileText size={32} className="text-accent mb-2" strokeWidth={1.75} />
            <span className="text-sm font-medium">CSV Notion</span>
          </button>

          <button type="button" onClick={() => exportToDrawIo(nodes, edges)} className={cardClass}>
            <div className="w-8 h-8 bg-accent text-[#0f141c] rounded-control mb-2 flex items-center justify-center text-xs font-bold">
              d
            </div>
            <span className="text-sm font-medium">Draw.io XML</span>
          </button>
        </div>
      </div>
    </div>
  );
};
