import React, { useMemo, useState, useCallback, useRef } from 'react';
import { MiniMap, useStore as useReactFlowStore, useReactFlow } from '@xyflow/react';
import { X, Crosshair } from 'lucide-react';
import { shallow } from 'zustand/shallow';

import { useStore } from '../store/useStore';
import { getColorValue, resolveNodeColor } from '../utils/colorMapping';

type FlowMiniMapProps = {
  onHide?: () => void;
};

const OFFSET_SCALE = 5;

function unionRects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
}

export const FlowMiniMap = ({ onHide }: FlowMiniMapProps) => {
  const theme = useStore((state) => state.ui.theme);
  const nodeColorBy = useStore((state) => state.settings.nodeColorBy) ?? 'category';
  const { transform, width, height } = useReactFlowStore(
    (s) => ({ transform: s.transform, width: s.width, height: s.height }),
    shallow
  );
  const reactFlow = useReactFlow();
  const nodeColorMap = useStore((state) => state.settings.nodeColorMap);
  const nodeColorPalette = useStore((state) => state.settings.nodeColorPalette);
  const notionFieldColors = useStore((state) => state.notionFieldColors);

  const [miniZoom, setMiniZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [centerLocked, setCenterLocked] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const baseSize = useMemo(() => ({ width: 240, height: 180 }), []);
  const minZoom = 1;
  const maxZoom = 4;
  const zoomFactor = 1.25;

  React.useEffect(() => {
    if (miniZoom <= 1) setPan({ x: 0, y: 0 });
  }, [miniZoom]);

  const handlePanStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (miniZoom <= 1 || centerLocked) return;
      e.preventDefault();
      setIsPanning(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      panStart.current = { x: clientX, y: clientY, panX: pan.x, panY: pan.y };
    },
    [miniZoom, centerLocked, pan]
  );

  const handlePanMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!panStart.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - panStart.current.x;
    const dy = clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, []);

  const handlePanEnd = useCallback(() => {
    panStart.current = null;
    setIsPanning(false);
  }, []);

  React.useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent | TouchEvent) => handlePanMove(e);
    const onUp = () => handlePanEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isPanning, handlePanMove, handlePanEnd]);

  const minimapStyle = useMemo(
    () => ({
      width: baseSize.width,
      height: baseSize.height,
      ['--minimap-zoom' as any]: miniZoom,
      ['--minimap-pan-x' as any]: `${pan.x}px`,
      ['--minimap-pan-y' as any]: `${pan.y}px`,
    }),
    [baseSize, miniZoom, pan]
  );

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

  const computeCenteredPan = useCallback(() => {
    const zoom = transform[2];
    if (!zoom || !width || !height) return null;
    const viewBB = {
      x: -transform[0] / zoom,
      y: -transform[1] / zoom,
      width: width / zoom,
      height: height / zoom,
    };
    const flowCenterX = viewBB.x + viewBB.width / 2;
    const flowCenterY = viewBB.y + viewBB.height / 2;

    const nodes = reactFlow.getNodes();
    let boundingRect = viewBB;
    if (nodes.length > 0) {
      const nodesBounds = reactFlow.getNodesBounds(nodes);
      boundingRect = unionRects(nodesBounds, viewBB);
    }

    const elementWidth = baseSize.width;
    const elementHeight = baseSize.height;
    const scaledWidth = boundingRect.width / elementWidth;
    const scaledHeight = boundingRect.height / elementHeight;
    const viewScale = Math.max(scaledWidth, scaledHeight);
    const viewWidth = viewScale * elementWidth;
    const viewHeight = viewScale * elementHeight;
    const offset = OFFSET_SCALE * viewScale;
    const vx = boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset;
    const vy = boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset;
    const vw = viewWidth + offset * 2;
    const vh = viewHeight + offset * 2;

    const svgX = ((flowCenterX - vx) / vw) * elementWidth;
    const svgY = ((flowCenterY - vy) / vh) * elementHeight;
    const effectiveZoom = miniZoom <= 1 ? 2 : miniZoom;
    const centerX = elementWidth / 2;
    const centerY = elementHeight / 2;
    return {
      panX: -(svgX - centerX) * effectiveZoom,
      panY: -(svgY - centerY) * effectiveZoom,
      needZoom: miniZoom <= 1,
    };
  }, [transform, width, height, reactFlow, baseSize, miniZoom]);

  React.useEffect(() => {
    if (!centerLocked) return;
    const result = computeCenteredPan();
    if (!result) return;
    if (result.needZoom) setMiniZoom(2);
    setPan({ x: result.panX, y: result.panY });
  }, [centerLocked, computeCenteredPan]);

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
      <div
        className="minimap-pan-area"
        style={{
          cursor: miniZoom > 1 && !centerLocked ? (isPanning ? 'grabbing' : 'grab') : undefined,
        }}
        onMouseDown={handlePanStart}
        onTouchStart={handlePanStart}
      >
        <MiniMap
          pannable={miniZoom <= 1}
          zoomable
        nodeColor={getMiniMapNodeColor}
        nodeStrokeColor={getMiniMapNodeStrokeColor}
        nodeStrokeWidth={1}
        bgColor={theme === 'dark' ? '#0d1117' : '#f5f7fb'}
        maskColor={theme === 'dark' ? 'rgba(6, 10, 16, 0.45)' : 'rgba(245, 247, 251, 0.6)'}
        maskStrokeColor={theme === 'dark' ? '#7ab6ff' : '#2f5dd0'}
        maskStrokeWidth={1}
        style={minimapStyle}
        />
      </div>
      <div className="minimap-zoom">
        <button
          type="button"
          className={`minimap-center-btn ${centerLocked ? 'minimap-center-btn--active' : ''}`}
          onClick={() => setCenterLocked((v) => !v)}
          title={centerLocked ? 'Отключить постоянное центрирование' : 'Включить постоянное центрирование на viewport'}
          aria-label={centerLocked ? 'Отключить постоянное центрирование' : 'Включить постоянное центрирование'}
          aria-pressed={centerLocked}
        >
          <Crosshair size={14} />
        </button>
        <button
          type="button"
          className="minimap-zoom-btn"
          onClick={() => setMiniZoom((value) => Math.min(maxZoom, +(value * zoomFactor).toFixed(3)))}
          disabled={miniZoom >= maxZoom}
          aria-label="Увеличить"
          title="Увеличить"
        >
          +
        </button>
        <button
          type="button"
          className="minimap-zoom-btn"
          onClick={() => setMiniZoom((value) => Math.max(minZoom, +(value / zoomFactor).toFixed(3)))}
          disabled={miniZoom <= minZoom}
          aria-label="Уменьшить"
          title="Уменьшить"
        >
          –
        </button>
      </div>
    </div>
  );
};
