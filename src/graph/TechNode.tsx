import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { renderTemplate } from '../utils/template';
import { getNotionPageUrl } from '../utils/notionUrl';
import { NotionIcon } from '../components/NotionIcon';
import clsx from 'clsx';
import type { NodeColorBy } from '../types';
import { getColorValue, resolveNodeColor } from '../utils/colorMapping';

const TechNode = ({ data, selected, id }: { data?: Record<string, any>; selected?: boolean; id?: string }) => {
  const template = useStore((state) => state.settings.nodeTemplate);
  const nodeColorBy = useStore((state) => state.settings.nodeColorBy) ?? 'category';
  const nodeColorPalette = useStore((state) => state.settings.nodeColorPalette);
  const nodeColorMap = useStore((state) => state.settings.nodeColorMap);
  const notionFieldColors = useStore((state) => state.notionFieldColors);
  const hasTemplate = template && template.trim().length > 0;
  const safeData = data ?? {};
  const colorValue = getColorValue(safeData, nodeColorBy);
  const accentColor = resolveNodeColor(colorValue, nodeColorMap, nodeColorPalette, notionFieldColors[nodeColorBy]);
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
        <div className="px-4 py-3 min-w-0 flex-1">
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
        {safeData.notionPageId && (
          <a
            href={getNotionPageUrl(safeData.notionPageId)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 self-start mt-2 mr-2 p-1 rounded text-muted hover:text-text hover:bg-control-hover-bg opacity-70 hover:opacity-100 transition-all"
            title="Открыть в Notion"
            onClick={(e) => e.stopPropagation()}
          >
            <NotionIcon size={14} color={accentColor} />
          </a>
        )}
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
