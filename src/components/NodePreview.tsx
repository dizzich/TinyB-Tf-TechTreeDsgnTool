import clsx from 'clsx';
import type { NodeColorBy } from '../types';
import { getColorValue, resolveNodeColor } from '../utils/colorMapping';
import { getNodePresetStyles } from '../utils/nodePresetStyles';
import { renderTemplate } from '../utils/template';

const SAMPLE_DATA = {
  label: 'Пример ноды',
  act: 1,
  stage: 2,
  category: 'Craft',
  powerType: 'Electricity',
  gameStatus: 'implemented',
  usedStations: [{ name: 'Станция' }],
  usedCraftStation: 'Верстак',
  techForAct: '🌳 Act 1',
  openCondition: 'Условие',
  tags: ['тег1', 'тег2'],
  outputItem: 'Результат',
};

export interface NodePreviewSettings {
  nodeTemplate: string;
  nodeMinWidth?: number;
  nodeMaxWidth?: number;
  nodeMinHeight?: number;
  nodeBorderWidth?: number;
  nodeLeftStripWidth?: number;
  nodeTextAlignH?: 'left' | 'center' | 'right';
  nodeTextAlignV?: 'top' | 'center' | 'bottom';
  nodeTextFit?: boolean;
  nodeVisualPreset?: string;
  nodeColorBy?: NodeColorBy;
  nodeColorPalette?: string[];
  nodeColorMap?: Record<string, string>;
}

interface NodePreviewProps {
  settings: NodePreviewSettings;
  notionFieldColors?: Record<string, string>;
}

export function NodePreview({ settings, notionFieldColors = {} }: NodePreviewProps) {
  const template = settings.nodeTemplate ?? '';
  const hasTemplate = template.trim().length > 0;
  const nodeColorBy = settings.nodeColorBy ?? 'category';
  const accentColor = resolveNodeColor(
    getColorValue(SAMPLE_DATA, nodeColorBy),
    settings.nodeColorMap,
    settings.nodeColorPalette,
    notionFieldColors[nodeColorBy]
  );
  const presetStyles = getNodePresetStyles(
    settings.nodeVisualPreset,
    accentColor,
    settings.nodeBorderWidth ?? 2
  );
  const minWidth = Math.min(settings.nodeMinWidth ?? 200, 280);
  const maxWidth = Math.min(settings.nodeMaxWidth ?? 320, 280);
  const minHeight = settings.nodeMinHeight ?? 48;
  const leftStripWidth = settings.nodeLeftStripWidth ?? 3;
  const textAlignH = settings.nodeTextAlignH ?? 'left';
  const textAlignV = settings.nodeTextAlignV ?? 'center';
  const textFit = settings.nodeTextFit ?? true;

  const content = hasTemplate
    ? (() => {
        const rendered = renderTemplate(template, SAMPLE_DATA);
        const hasContent = rendered && /[\p{L}\p{N}]/u.test(rendered);
        return hasContent ? rendered : SAMPLE_DATA.label;
      })()
    : SAMPLE_DATA.label;

  return (
    <div className="max-w-full overflow-hidden rounded-[10px] border border-panel-border bg-panel-2/50 p-3">
      <div
        className={clsx(
          'rounded-[10px] text-text overflow-hidden text-xs font-mono whitespace-pre-wrap flex flex-col',
          presetStyles.className
        )}
        style={{
          minWidth,
          maxWidth,
          minHeight,
          ...presetStyles.style,
        }}
      >
        <div className="flex flex-1 min-h-0">
          {presetStyles.showLeftStrip && (
            <div
              className="shrink-0 self-stretch"
              style={{ width: leftStripWidth, backgroundColor: accentColor }}
            />
          )}
          <div
            className={clsx(
              'px-4 py-3 min-w-0 flex-1 flex',
              textAlignV === 'top' && 'items-start',
              textAlignV === 'center' && 'items-center',
              textAlignV === 'bottom' && 'items-end',
              textAlignH === 'left' && 'justify-start text-left',
              textAlignH === 'center' && 'justify-center text-center',
              textAlignH === 'right' && 'justify-end text-right'
            )}
          >
            <span
              className={clsx(
                'text-xs font-mono whitespace-pre-wrap',
                textFit && 'overflow-hidden block max-w-full'
              )}
            >
              {content}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
