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
                labelColumn: keys.find((k) => k.toLowerCase().includes('name') || k.toLowerCase().includes('label')) || keys[0],
                actColumn: keys.find((k) => k.toLowerCase().includes('act')) || '',
                stageColumn: keys.find((k) => k.toLowerCase().includes('stage')) || '',
                categoryColumn: keys.find((k) => k.toLowerCase().includes('category') || k.toLowerCase().includes('type')) || '',
                dependencyColumn: keys.find((k) => k.toLowerCase().includes('prereq') || k.toLowerCase().includes('dependency')) || '',
                nextTechsColumn: keys.find((k) => k === 'NextTechs') || '',
              });
            }
            setStep(2);
        }
      } catch (err) {
        console.error("CSV Parse Error", err);
        alert("Failed to parse CSV");
      }
    }
  };

  const handleImport = () => {
    const { nodes, edges } = generateGraphFromCSV(csvData, mapping);
    
    // Auto layout after import
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setModalOpen('import', false);
    
    // Reset state
    setFile(null);
    setStep(1);
    setCsvData([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Import from CSV</h2>
          <button onClick={() => setModalOpen('import', false)} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
            {step === 1 && (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                    <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click or drag CSV file here</p>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">Map CSV columns to node properties:</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {Object.keys(mapping).map((key) => (
                            <div key={key}>
                                <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                                    {key.replace('Column', '')}
                                </label>
                                <select
                                    className="w-full border rounded px-2 py-1 text-sm"
                                    value={mapping[key as keyof ImportMapping]}
                                    onChange={(e) => setMapping({...mapping, [key]: e.target.value})}
                                >
                                    <option value="">(None)</option>
                                    {headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
           <button 
             onClick={() => setModalOpen('import', false)}
             className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
             Cancel
           </button>
           {step === 2 && (
               <button 
                onClick={handleImport}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
               >
                Import <ArrowRight size={16} className="ml-2" />
               </button>
           )}
        </div>
      </div>
    </div>
  );
};
