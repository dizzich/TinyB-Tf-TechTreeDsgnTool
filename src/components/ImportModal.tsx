import React, { useState } from 'react';
import { X, Upload, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { parseCSV, generateGraphFromCSV } from '../utils/csvImport';
import { ImportMapping } from '../types';
import { getLayoutedElements } from '../utils/autoLayout';

const NOTION_CRAFTS_MAPPING: ImportMapping = {
  idColumn: 'TechCraftID',
  labelColumn: 'WorkingName',
  actColumn: 'ActAndStage',
  stageColumn: 'ActStage',
  categoryColumn: 'CategoryFromItem',
  dependencyColumn: 'PrevTechs',
  nextTechsColumn: 'NextTechs',
};

const inputClass =
  'w-full border border-control-border rounded-control px-2.5 py-1.5 text-sm bg-control-bg text-text focus:outline-none focus:border-accent';
const labelClass = 'block text-xs font-medium text-muted mb-1';
const btnPrimary = 'px-4 py-2 bg-accent text-[#0f141c] rounded-control font-medium hover:bg-accent-hover flex items-center';
const btnSecondary =
  'px-4 py-2 bg-control-bg border border-control-border rounded-control text-text hover:bg-control-hover-bg hover:border-control-hover-border';

export const ImportModal = () => {
  const isOpen = useStore((state) => state.modals.import);
  const setModalOpen = useStore((state) => state.setModalOpen);
  const setNodes = useStore((state) => state.setNodes);
  const setEdges = useStore((state) => state.setEdges);

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const [mapping, setMapping] = useState<ImportMapping>({
    idColumn: '',
    labelColumn: '',
    actColumn: '',
    stageColumn: '',
    categoryColumn: '',
    dependencyColumn: '',
    nextTechsColumn: '',
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      try {
        const data = await parseCSV(selectedFile);
        if (data.length > 0) {
          setCsvData(data);
          const keys = Object.keys(data[0]);
          setHeaders(keys);

          const hasNotionCrafts = keys.includes('TechCraftID') && keys.includes('PrevTechs');
          if (hasNotionCrafts) {
            setMapping({ ...NOTION_CRAFTS_MAPPING });
          } else {
            setMapping({
              idColumn: keys.find((k) => k.toLowerCase().includes('id')) || keys[0],
              labelColumn:
                keys.find((k) => k.toLowerCase().includes('name') || k.toLowerCase().includes('label')) || keys[0],
              actColumn: keys.find((k) => k.toLowerCase().includes('act')) || '',
              stageColumn: keys.find((k) => k.toLowerCase().includes('stage')) || '',
              categoryColumn:
                keys.find((k) => k.toLowerCase().includes('category') || k.toLowerCase().includes('type')) || '',
              dependencyColumn:
                keys.find((k) => k.toLowerCase().includes('prereq') || k.toLowerCase().includes('dependency')) || '',
              nextTechsColumn: keys.find((k) => k === 'NextTechs') || '',
            });
          }
          setStep(2);
        }
      } catch (err) {
        console.error('CSV Parse Error', err);
        alert('Failed to parse CSV');
      }
    }
  };

  const handleImport = () => {
    const { nodes, edges } = generateGraphFromCSV(csvData, mapping);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setModalOpen('import', false);
    setFile(null);
    setStep(1);
    setCsvData([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'var(--modal-overlay)' }}
    >
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-[600px] max-h-[90vh] flex flex-col">
        <div className="modal__header p-4 border-b border-panel-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text uppercase tracking-wider">Import from CSV</h2>
          <button
            type="button"
            onClick={() => setModalOpen('import', false)}
            className="w-9 h-9 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-control-hover-border"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="modal__content p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="relative flex flex-col items-center justify-center h-48 border-2 border-dashed border-control-border rounded-control bg-control-bg-muted hover:bg-control-hover-bg hover:border-control-hover-border transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload size={32} className="text-muted mb-2" strokeWidth={1.75} />
              <p className="text-sm text-muted">Click or drag CSV file here</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted mb-4">Map CSV columns to node properties:</p>
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(mapping).map((key) => (
                  <div key={key}>
                    <label className={`${labelClass} capitalize`}>{key.replace('Column', '')}</label>
                    <select
                      className={inputClass}
                      value={mapping[key as keyof ImportMapping]}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                    >
                      <option value="">(None)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-panel-border flex justify-end gap-2 bg-panel-2 rounded-b-[16px]">
          <button type="button" onClick={() => setModalOpen('import', false)} className={btnSecondary}>
            Cancel
          </button>
          {step === 2 && (
            <button type="button" onClick={handleImport} className={btnPrimary}>
              Import <ArrowRight size={16} className="ml-2" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
