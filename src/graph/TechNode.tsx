import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { renderTemplate } from '../utils/template';
import clsx from 'clsx';

const CATEGORY_COLORS = [
  '#6aa2ff', // blue
  '#a78bfa', // purple
  '#f59e42', // orange
  '#34d399', // emerald
  '#f472b6', // pink
  '#fbbf24', // amber
  '#38bdf8', // sky
  '#e36f6f', // red
];

function categoryToColor(category?: string): string {
  if (!category) return CATEGORY_COLORS[0];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

const TechNode = ({ data, selected, id }: { data?: Record<string, any>; selected?: boolean; id?: string }) => {
  const template = useStore((state) => state.settings.nodeTemplate);
  const hasTemplate = template && template.trim().length > 0;
  const safeData = data ?? {};
  const accentColor = categoryToColor(safeData.category);
  const displayLabel = safeData.label ?? safeData.techCraftId ?? safeData.outputItem ?? id ?? 'Без названия';

  return (
    <div
      className={clsx(
        'rounded-[10px] border-2 min-w-[200px] max-w-[320px] transition-all bg-panel-2 text-text overflow-hidden',
        selected
          ? 'border-accent shadow-[0_0_18px_rgba(106,162,255,0.35)]'
          : 'border-panel-border hover:border-control-hover-border hover:shadow-panel'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3.5 !h-3.5 !bg-control-border hover:!bg-accent !border-0 !rounded-full"
      />
      <div className="flex">
        <div
          className="w-[3px] shrink-0"
          style={{ backgroundColor: accentColor }}
        />
        <div className="px-4 py-3 min-w-0">
          {hasTemplate ? (
            <div className="text-xs font-mono whitespace-pre-wrap">
              {(() => {
                const rendered = renderTemplate(template, safeData);
                const hasContent = rendered && /[\p{L}\p{N}]/u.test(rendered);
                return hasContent ? rendered : displayLabel;
              })()}
            </div>
          ) : (
            <>
              <div className="text-[15px] font-semibold leading-tight truncate">
                {displayLabel}
              </div>
              {(safeData.act || safeData.stage || safeData.category) && (
                <div className="text-[12px] text-muted mt-0.5 truncate">
                  {safeData.act && `Act ${safeData.act}`}
                  {safeData.stage && `${safeData.act ? ' \u00b7 ' : ''}Stage ${safeData.stage}`}
                  {safeData.category && `${safeData.act || safeData.stage ? ' \u00b7 ' : ''}${safeData.category}`}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3.5 !h-3.5 !bg-control-border hover:!bg-accent !border-0 !rounded-full"
      />
    </div>
  );
};

export default memo(TechNode);
