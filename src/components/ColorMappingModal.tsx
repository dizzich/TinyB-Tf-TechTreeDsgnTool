import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { NodeColorBy } from '../types';
import { DEFAULT_NODE_COLOR_PALETTE } from '../types';
import { collectUniqueValues, resolveNodeColor } from '../utils/colorMapping';

const labelClass = 'block text-sm font-medium text-muted mb-2';

export const COLOR_BY_OPTIONS: { value: NodeColorBy; label: string }[] = [
  { value: 'category', label: 'Категория' },
  { value: 'stage', label: 'Стадия' },
  { value: 'act', label: 'Акт' },
  { value: 'powerType', label: 'Тип питания' },
  { value: 'gameStatus', label: 'Статус в игре' },
  { value: 'openCondition', label: 'OpenCondition (условие открытия)' },
  { value: 'usedCraftStation', label: 'На чём крафтится (UsedCraftStation)' },
  { value: 'usedStation', label: 'Станция крафта (UsedStation)' },
];

export const ColorMappingModal = () => {
  const isOpen = useStore((state) => state.modals.colorMapping);
  const settings = useStore((state) => state.settings);
  const nodes = useStore((state) => state.nodes);
  const notionFieldColors = useStore((state) => state.notionFieldColors);
  const setModalOpen = useStore((state) => state.setModalOpen);
  const updateSettings = useStore((state) => state.updateSettings);

  const [localColorBy, setLocalColorBy] = useState<NodeColorBy>(
    settings.nodeColorBy ?? 'category'
  );
  const [localColorMap, setLocalColorMap] = useState<Record<string, string>>(
    settings.nodeColorMap ?? {}
  );
  const [localPalette, setLocalPalette] = useState<string[]>(
    settings.nodeColorPalette ?? [...DEFAULT_NODE_COLOR_PALETTE]
  );

  const uniqueValues = useMemo(
    () => collectUniqueValues(nodes, localColorBy),
    [nodes, localColorBy]
  );

  useEffect(() => {
    if (isOpen) {
      setLocalColorBy(settings.nodeColorBy ?? 'category');
      setLocalColorMap(settings.nodeColorMap ?? {});
      setLocalPalette(settings.nodeColorPalette ?? [...DEFAULT_NODE_COLOR_PALETTE]);
    }
  }, [isOpen, settings.nodeColorBy, settings.nodeColorMap, settings.nodeColorPalette]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings({
      nodeColorBy: localColorBy,
      nodeColorMap: Object.keys(localColorMap).length > 0 ? localColorMap : undefined,
      nodeColorPalette: localPalette,
    });
    setModalOpen('colorMapping', false);
  };

  const handleCancel = () => {
    setLocalColorBy(settings.nodeColorBy ?? 'category');
    setLocalColorMap(settings.nodeColorMap ?? {});
    setLocalPalette(settings.nodeColorPalette ?? [...DEFAULT_NODE_COLOR_PALETTE]);
    setModalOpen('colorMapping', false);
  };

  const notionDefaults = notionFieldColors[localColorBy];
  const getColorForValue = (value: string) =>
    localColorMap[value] ?? notionDefaults?.[value] ?? resolveNodeColor(
      value === '' ? undefined : value,
      undefined,
      localPalette,
      notionDefaults
    );

  const handleColorChange = (value: string, hex: string) => {
    setLocalColorMap((prev) => ({ ...prev, [value]: hex }));
  };

  const handleAutoAssign = () => {
    const palette = localPalette.length > 0 ? localPalette : DEFAULT_NODE_COLOR_PALETTE;
    const next: Record<string, string> = {};
    uniqueValues.forEach((v, i) => {
      next[v.value] = palette[i % palette.length];
    });
    setLocalColorMap(next);
  };

  const handleClearMapping = () => {
    setLocalColorMap({});
  };

  const handleResetPalette = () => {
    setLocalPalette([...DEFAULT_NODE_COLOR_PALETTE]);
  };

  const handlePaletteChange = (index: number, hex: string) => {
    setLocalPalette((prev) => {
      const next = [...prev];
      next[index] = hex;
      return next;
    });
  };

  const currentOptLabel = COLOR_BY_OPTIONS.find((o) => o.value === localColorBy)?.label ?? localColorBy;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'var(--modal-overlay)' }}
    >
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-full max-w-xl flex flex-col max-h-[85vh] transition-colors">
        <div className="modal__header flex items-center justify-between p-4 border-b border-panel-border shrink-0">
          <h2 className="text-lg font-semibold text-text uppercase tracking-wider">
            Маппинг цветов нод
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="w-9 h-9 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-control-hover-border transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="modal__content flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className={labelClass}>Красить ноды по</label>
            <select
              value={localColorBy}
              onChange={(e) => setLocalColorBy(e.target.value as NodeColorBy)}
              className="w-full border border-control-border rounded-control px-2.5 py-1.5 text-sm bg-control-bg text-text focus:outline-none focus:border-accent transition-colors"
            >
              {COLOR_BY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Левая полоска на нодах окрашивается по выбранному атрибуту. Ниже — сопоставление значений с цветами.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>
                Цвет для каждого значения «{currentOptLabel}»
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAutoAssign}
                  className="text-xs px-2 py-1 rounded-control border border-control-border bg-control-bg-muted hover:bg-control-hover-bg text-text transition-colors"
                >
                  Авто-раскрасить
                </button>
                {Object.keys(localColorMap).length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMapping}
                    className="text-xs px-2 py-1 rounded-control border border-control-border text-muted hover:text-text hover:bg-control-hover-bg transition-colors"
                  >
                    Сбросить свои
                  </button>
                )}
              </div>
            </div>
            {uniqueValues.length === 0 ? (
              <p className="text-sm text-muted py-4">Нет нод для отображения. Добавьте ноды или импортируйте данные.</p>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {uniqueValues.map(({ value, displayLabel, count }) => {
                  const color = getColorForValue(value);
                  return (
                    <li
                      key={value === '' ? '__empty__' : value}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-control hover:bg-control-bg-muted transition-colors"
                    >
                      <label
                        className="w-8 h-8 shrink-0 rounded-control border-2 border-control-border hover:border-accent cursor-pointer overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => handleColorChange(value, e.target.value)}
                          className="opacity-0 w-full h-full cursor-pointer"
                        />
                      </label>
                      <span className="text-sm text-text truncate flex-1" title={displayLabel}>
                        {displayLabel}
                      </span>
                      <span className="text-xs text-muted shrink-0">
                        {count}{' '}
                        {count % 10 === 1 && count % 100 !== 11
                          ? 'нода'
                          : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)
                            ? 'ноды'
                            : 'нод'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">
              По умолчанию используются цвета из Notion. Клик по цвету — изменить. «Сбросить свои» вернёт цвета из Notion.
            </p>
          </div>

          <details className="group border border-panel-border rounded-control p-3">
            <summary className="cursor-pointer text-sm font-medium text-muted hover:text-text transition-colors list-none">
              Палитра по умолчанию (для новых значений)
            </summary>
            <div className="mt-3 pl-4">
              <div className="flex flex-wrap gap-2">
                {localPalette.map((color, i) => (
                  <label
                    key={i}
                    className="w-9 h-9 rounded-control border-2 border-control-border hover:border-accent cursor-pointer overflow-hidden transition-colors"
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handlePaletteChange(i, e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleResetPalette}
                className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Сбросить палитру
              </button>
              <p className="mt-1 text-xs text-muted">
                Используется для значений без явного сопоставления и при «Авто-раскрасить».
              </p>
            </div>
          </details>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-panel-border bg-panel-2 rounded-b-[16px] shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm bg-control-bg border border-control-border rounded-control text-text hover:bg-control-hover-bg hover:border-control-hover-border transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-accent text-[#0f141c] rounded-control font-medium hover:bg-accent-hover shadow-[0_0_15px_rgba(106,162,255,0.3)] transition-all"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};
