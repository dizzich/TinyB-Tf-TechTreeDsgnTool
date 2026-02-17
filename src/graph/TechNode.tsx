import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { renderTemplate } from '../utils/template';
import clsx from 'clsx';

const TechNode = ({ data, selected }: { data: Record<string, any>; selected?: boolean }) => {
  const template = useStore((state) => state.settings.nodeTemplate);
  
  // Render content based on template or fallback to label
  const content = template ? renderTemplate(template, data) : (data.label || 'Node');

  return (
    <div 
      className={clsx(
        "px-4 py-2 rounded shadow-md border-2 bg-white min-w-[150px] transition-colors",
        selected ? "border-blue-500 shadow-lg" : "border-gray-300 hover:border-gray-400"
      )}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      
      <div className="text-xs font-mono whitespace-pre-wrap">
        {content || data.label || 'Empty Node'}
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-gray-400" />
    </div>
  );
};

export default memo(TechNode);
