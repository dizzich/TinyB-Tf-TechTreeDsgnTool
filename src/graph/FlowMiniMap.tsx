import React, { useMemo, useState, useCallback } from 'react';
import { MiniMap } from '@xyflow/react';
import { X } from 'lucide-react';

import { useStore } from '../store/useStore';
import { getColorValue, resolveNodeColor } from '../utils/colorMapping';

type FlowMiniMapProps = {
  onHide?: () => void;
};

export const FlowMiniMap = ({ onHide }: FlowMiniMapProps) => {
  const theme = useStore((state) => state.ui.theme);
  const nodeColorBy = useStore((state) => state.settings.nodeColorBy) ?? 'category';
  const nodeColorMap = useStore((state) => state.settings.nodeColorMap);
  const nodeColorPalette = useStore((state) => state.settings.nodeColorPalette);
  const notionFieldColors = useStore((state) => state.notionFieldColors);

  const [miniScale, setMiniScale] = useState(1);
  const baseSize = useMemo(() => ({ width: 240, height: 180 }), []);
  const size = useMemo(
    () => ({
      width: Math.round(baseSize.width * miniScale),
      height: Math.round(baseSize.height * miniScale),
    }),
    [baseSize, miniScale]
  );
  const minScale = 0.25;
  const maxScale = 4;
  const zoomFactor = 1.25;

  const getMiniMapNodeColor = useCallback(
    (node: any) => {
      if (node.selected) return theme === 'dark' ? '#8cc8ff' : '#2f5dd0';
      const colorValue = getColorValue(node.data ?? {}, nodeColorBy);
      return resolveNodeColor(
        colorValue,
        nodeColorMap,
        nodeColorPalette,
        notionFieldColors[nodeColorBy]
      );
    },
    [theme, nodeColorBy, nodeColorMap, nodeColorPalette, notionFieldColors]
  );

  const getMiniMapNodeStrokeColor = useCallback(
    (node: any) => {
      if (node.selected) return theme === 'dark' ? '#ffffff' : '#1d3fa3';
      return theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)';
    },
    [theme]
  );

  return (
    <div className="minimap-shell">
      {onHide && (
        <button
          type="button"
          className="minimap-hide-btn"
          onClick={onHide}
          title="Скрыть миникарту"
          aria-label="Скрыть миникарту"
        >
          <X size={14} />
        </button>
      )}
      <MiniMap
        pannable
        zoomable
        nodeColor={getMiniMapNodeColor}
        nodeStrokeColor={getMiniMapNodeStrokeColor}
        nodeStrokeWidth={1}
        bgColor={theme === 'dark' ? '#0d1117' : '#f5f7fb'}
        maskColor={theme === 'dark' ? 'rgba(6, 10, 16, 0.45)' : 'rgba(245, 247, 251, 0.6)'}
        maskStrokeColor={theme === 'dark' ? '#7ab6ff' : '#2f5dd0'}
        maskStrokeWidth={1}
        style={{ width: size.width, height: size.height }}
      />
      <div className="minimap-zoom">
        <button
          type="button"
          className="minimap-zoom-btn"
          onClick={() => setMiniScale((value) => Math.min(maxScale, +(value * zoomFactor).toFixed(3)))}
          disabled={miniScale >= maxScale}
          aria-label="Увеличить"
          title="Увеличить"
        >
          +
        </button>
        <button
          type="button"
          className="minimap-zoom-btn"
          onClick={() => setMiniScale((value) => Math.max(minScale, +(value / zoomFactor).toFixed(3)))}
          disabled={miniScale <= minScale}
          aria-label="Уменьшить"
          title="Уменьшить"
        >
          –
        </button>
      </div>
    </div>
  );
};
