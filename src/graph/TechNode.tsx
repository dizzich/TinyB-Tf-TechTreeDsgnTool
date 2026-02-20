import { memo, useRef, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useStore } from '../store/useStore';
import { renderTemplate } from '../utils/template';
import { getNotionPageUrl } from '../utils/notionUrl';
import { NotionIcon } from '../components/NotionIcon';
import clsx from 'clsx';
import type { NodeColorBy } from '../types';
import { getColorValue, resolveNodeColor } from '../utils/colorMapping';
import { getNodePresetStyles } from '../utils/nodePresetStyles';

const DEFAULT_NODE_MIN_WIDTH = 200;
const DEFAULT_NODE_MAX_WIDTH = 320;
const DEFAULT_NODE_MIN_HEIGHT = 48;

const CLICK_MAX_MS = 400;
const CLICK_MAX_DIST_PX = 8;

const TechNode = ({ data, selected, id }: { data?: Record<string, any>; selected?: boolean; id?: string }) => {
  const isHighlighted = selected || data?.edgeHighlighted;
  const edges = useStore((state) => state.edges);
  const setConnectedSubgraphHighlight = useStore((state) => state.setConnectedSubgraphHighlight);
  const pointerDownRef = useRef<{ x: number; y: number; time: number; type: 'source' | 'target' } | null>(null);
  const pointerUpHandlerRef = useRef<((e: PointerEvent) => void) | null>(null);

  const handleConnectorPointerDown = useCallback(
    (ev: React.PointerEvent, type: 'source' | 'target') => {
      pointerDownRef.current = { x: ev.clientX, y: ev.clientY, time: Date.now(), type };
      const up = (e: PointerEvent) => {
        document.removeEventListener('pointerup', up);
        pointerUpHandlerRef.current = null;
        const down = pointerDownRef.current;
        pointerDownRef.current = null;
        if (!down || down.type !== type || !id) return;
        const dt = Date.now() - down.time;
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        if (dt < CLICK_MAX_MS && dx * dx + dy * dy < CLICK_MAX_DIST_PX * CLICK_MAX_DIST_PX) {
          if (type === 'target') {
            const incoming = edges.filter((edge) => edge.target === id);
            const edgeIds = new Set(incoming.map((edge) => edge.id));
            const nodeIds = new Set<string>([id, ...incoming.map((edge) => edge.source)]);
            setConnectedSubgraphHighlight({ nodeIds, edgeIds });
          } else {
            const outgoing = edges.filter((edge) => edge.source === id);
            const edgeIds = new Set(outgoing.map((edge) => edge.id));
            const nodeIds = new Set<string>([id, ...outgoing.map((edge) => edge.target)]);
            setConnectedSubgraphHighlight({ nodeIds, edgeIds });
          }
        }
      };
      pointerUpHandlerRef.current = up;
      document.addEventListener('pointerup', up);
    },
    [id, edges, setConnectedSubgraphHighlight]
  );

  useEffect(() => {
    return () => {
      const handler = pointerUpHandlerRef.current;
      if (handler) {
        document.removeEventListener('pointerup', handler);
        pointerUpHandlerRef.current = null;
      }
    };
  }, []);

  const template = useStore((state) => state.settings.nodeTemplate);
  const nodeColorBy = useStore((state) => state.settings.nodeColorBy) ?? 'category';
  const nodeColorPalette = useStore((state) => state.settings.nodeColorPalette);
  const nodeColorMap = useStore((state) => state.settings.nodeColorMap);
  const notionFieldColors = useStore((state) => state.notionFieldColors);
  const nodeMinWidth = useStore((state) => state.settings.nodeMinWidth) ?? DEFAULT_NODE_MIN_WIDTH;
  const nodeMaxWidth = useStore((state) => state.settings.nodeMaxWidth) ?? DEFAULT_NODE_MAX_WIDTH;
  const nodeMinHeight = useStore((state) => state.settings.nodeMinHeight) ?? DEFAULT_NODE_MIN_HEIGHT;
  const nodeBorderWidth = useStore((state) => state.settings.nodeBorderWidth) ?? 2;
  const nodeLeftStripWidth = useStore((state) => state.settings.nodeLeftStripWidth) ?? 3;
  const nodeTextAlignH = useStore((state) => state.settings.nodeTextAlignH) ?? 'left';
  const nodeTextAlignV = useStore((state) => state.settings.nodeTextAlignV) ?? 'center';
  const nodeTextFit = useStore((state) => state.settings.nodeTextFit) ?? true;
  const nodeVisualPreset = useStore((state) => state.settings.nodeVisualPreset) ?? 'default';
  const hasTemplate = template && template.trim().length > 0;
  const safeData = data ?? {};
  const colorValue = getColorValue(safeData, nodeColorBy);
  const accentColor = resolveNodeColor(colorValue, nodeColorMap, nodeColorPalette, notionFieldColors[nodeColorBy]);
  const displayLabel = safeData.label ?? safeData.techCraftId ?? safeData.outputItem ?? id ?? 'Без названия';

  const presetStyles = getNodePresetStyles(nodeVisualPreset, accentColor, nodeBorderWidth);
  const sizeStyle = {
    minWidth: nodeMinWidth,
    maxWidth: nodeMaxWidth,
    minHeight: nodeMinHeight,
  };

  return (
    <div
      className={clsx(
        'rounded-[10px] transition-all text-text overflow-hidden flex flex-col',
        presetStyles.className,
        isHighlighted && 'shadow-[0_0_18px_rgba(106,162,255,0.35)]',
        isHighlighted && nodeVisualPreset === 'default' && '!border-accent'
      )}
      style={{ ...sizeStyle, ...presetStyles.style }}
    >
      <span data-connector-click style={{ display: 'contents' }}>
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3.5 !h-3.5 !bg-control-border hover:!bg-accent !border-0 !rounded-full"
          onPointerDown={(e) => handleConnectorPointerDown(e, 'target')}
        />
      </span>
      <div className="flex flex-1 min-h-0">
        {presetStyles.showLeftStrip && (
          <div
            className="shrink-0 self-stretch"
            style={{ width: nodeLeftStripWidth, backgroundColor: accentColor }}
          />
        )}
        <div
          className={clsx(
            'px-4 py-3 min-w-0 flex-1 flex flex-col',
            nodeTextAlignV === 'top' && 'justify-start',
            nodeTextAlignV === 'center' && 'justify-center',
            nodeTextAlignV === 'bottom' && 'justify-end',
            nodeTextAlignH === 'left' && 'items-start text-left',
            nodeTextAlignH === 'center' && 'items-center text-center',
            nodeTextAlignH === 'right' && 'items-end text-right'
          )}
        >
          {hasTemplate ? (
            <div
              className={clsx(
                'text-xs font-mono whitespace-pre-wrap',
                nodeTextFit ? 'overflow-hidden' : 'overflow-visible'
              )}
            >
              {(() => {
                const rendered = renderTemplate(template, safeData);
                const hasContent = rendered && /[\p{L}\p{N}]/u.test(rendered);
                return hasContent ? rendered : displayLabel;
              })()}
            </div>
          ) : (
            <>
              <div
                className={clsx(
                  'text-[15px] font-semibold leading-tight',
                  nodeTextFit && 'truncate overflow-hidden'
                )}
              >
                {displayLabel}
              </div>
              {(safeData.techForAct || safeData.act || safeData.stage || safeData.category) && (
                <div
                  className={clsx(
                    'text-[12px] text-muted mt-0.5',
                    nodeTextFit && 'truncate overflow-hidden'
                  )}
                >
                  {(safeData.techForAct || safeData.act) && (safeData.techForAct || `Act ${safeData.act}`)}
                  {safeData.stage && `${safeData.techForAct || safeData.act ? ' \u00b7 ' : ''}Stage ${safeData.stage}`}
                  {safeData.category && `${safeData.techForAct || safeData.act || safeData.stage ? ' \u00b7 ' : ''}${safeData.category}`}
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
      <span data-connector-click style={{ display: 'contents' }}>
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3.5 !h-3.5 !bg-control-border hover:!bg-accent !border-0 !rounded-full"
          onPointerDown={(e) => handleConnectorPointerDown(e, 'source')}
        />
      </span>
    </div>
  );
};

export default memo(TechNode);
