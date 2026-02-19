import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { NodePreview } from './NodePreview';
import type { NodeVisualPreset } from '../types';

const inputClass =
  'w-full border border-control-border rounded-control px-2.5 py-1.5 text-sm bg-control-bg text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors';
const labelClass = 'block text-sm font-medium text-muted mb-2';

const NODE_VISUAL_PRESETS: { value: NodeVisualPreset; label: string }[] = [
  { value: 'default', label: 'Обычный — нейтральная обводка, полоска цвета слева' },
  { value: 'bold', label: 'Жирная обводка — обводка и тёмный фон цветом категории' },
  { value: 'outline', label: 'Только обводка — обводка цветом, фон обычный' },
  { value: 'minimal', label: 'Минимальный — нейтральная обводка, без полоски' },
  { value: 'striped', label: 'Полосатая заливка — диагональные полосы в стиле draw.io' },
];

export const SettingsModal = () => {
  const isOpen = useStore((state) => state.modals.settings);
  const settings = useStore((state) => state.settings);
  const theme = useStore((state) => state.ui.theme);
  const notionFieldColors = useStore((state) => state.notionFieldColors);
  const setModalOpen = useStore((state) => state.setModalOpen);
  const updateSettings = useStore((state) => state.updateSettings);
  const setTheme = useStore((state) => state.setTheme);

  const [activeTab, setActiveTab] = useState<'general' | 'visuals' | 'template' | 'performance'>('general');
  const [localSettings, setLocalSettings] = useState(settings);
  const [localTheme, setLocalTheme] = useState(theme);

  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setLocalTheme(theme);
    }
  }, [isOpen, settings, theme]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    setTheme(localTheme);
    setModalOpen('settings', false);
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    setLocalTheme(theme);
    setModalOpen('settings', false);
  };

  const tabNames = {
    general: 'Основные',
    visuals: 'Визуал',
    template: 'Шаблон',
    performance: 'Производительность',
  };

  const placeholders = [
    { key: '%label%', desc: 'Название узла' },
    { key: '%act%', desc: 'Номер акта' },
    { key: '%stage%', desc: 'Номер стадии' },
    { key: '%category%', desc: 'Название категории' },
    { key: '%techCraftId%', desc: 'TechCraft ID' },
    { key: '%outputItem%', desc: 'Результат крафта' },
    { key: '%gameStatus%', desc: 'Игровой статус' },
    { key: '%designStatus%', desc: 'Статус дизайна' },
    { key: '%formulaIngridients%', desc: 'Ингредиенты' },
    { key: '%formulaUsedStation%', desc: 'Станция крафта' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'var(--modal-overlay)' }}
    >
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden transition-colors">
        <div className="modal__header flex items-center justify-between p-4 border-b border-panel-border">
          <h2 className="text-lg font-semibold text-text uppercase tracking-wider">Настройки</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="w-9 h-9 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-control-hover-border transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex shrink-0 border-b border-panel-border overflow-x-auto min-w-0 px-4">
          {(['general', 'visuals', 'template', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              {tabNames[tab]}
            </button>
          ))}
        </div>

        <div className="modal__content flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Направление размещения</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-text hover:text-accent transition-colors">
                    <input
                      type="radio"
                      name="layoutDirection"
                      value="LR"
                      checked={localSettings.layoutDirection === 'LR'}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          layoutDirection: e.target.value as 'LR' | 'TB',
                        })
                      }
                      className="w-4 h-4 border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                    />
                    <span>Слева направо (LR)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-text hover:text-accent transition-colors">
                    <input
                      type="radio"
                      name="layoutDirection"
                      value="TB"
                      checked={localSettings.layoutDirection === 'TB'}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          layoutDirection: e.target.value as 'LR' | 'TB',
                        })
                      }
                      className="w-4 h-4 border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                    />
                    <span>Сверху вниз (TB)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Тема интерфейса</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setLocalTheme('dark')}
                    className={`p-4 border rounded-control flex flex-col items-center gap-2 transition-all ${
                      localTheme === 'dark'
                        ? 'bg-panel border-accent shadow-[0_0_10px_rgba(106,162,255,0.2)]'
                        : 'bg-control-bg border-control-border hover:border-control-hover-border'
                    }`}
                  >
                    <div className="w-full h-12 bg-[#15171c] rounded border border-[#2c3340] relative overflow-hidden">
                      <div className="absolute top-2 left-2 w-8 h-2 bg-[#6aa2ff] rounded-sm"></div>
                    </div>
                    <span className={`text-sm font-medium ${localTheme === 'dark' ? 'text-accent' : 'text-text'}`}>
                      Тёмная
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalTheme('light')}
                    className={`p-4 border rounded-control flex flex-col items-center gap-2 transition-all ${
                      localTheme === 'light'
                        ? 'bg-white border-accent shadow-[0_0_10px_rgba(56,103,214,0.2)]'
                        : 'bg-gray-100 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-full h-12 bg-[#f5f7fb] rounded border border-[#d7dee8] relative overflow-hidden">
                      <div className="absolute top-2 left-2 w-8 h-2 bg-[#3867d6] rounded-sm"></div>
                    </div>
                    <span className={`text-sm font-medium ${localTheme === 'light' ? 'text-accent' : 'text-gray-700'}`}>
                      Светлая
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Шаблон подписи узла</label>
                <textarea
                  value={localSettings.nodeTemplate}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, nodeTemplate: e.target.value })
                  }
                  className={`${inputClass} h-32 resize-none font-mono`}
                  placeholder="%label%\n%act% %stage% | %category%"
                />
                <p className="mt-1 text-xs text-muted">
                  Используйте заполнители типа %label%, %act% и т.д. по полям NodeData. Неизвестные — пустые.
                </p>
              </div>

              <div className="border-t border-panel-border pt-4">
                <h3 className="text-sm font-medium text-text mb-3">Визуал нод</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelClass}>Мин. ширина (px)</label>
                    <input
                      type="number"
                      min={120}
                      max={500}
                      value={localSettings.nodeMinWidth ?? 200}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          nodeMinWidth: Math.min(500, Math.max(120, parseInt(e.target.value, 10) || 200)),
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Макс. ширина (px)</label>
                    <input
                      type="number"
                      min={120}
                      max={500}
                      value={localSettings.nodeMaxWidth ?? 320}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          nodeMaxWidth: Math.min(500, Math.max(120, parseInt(e.target.value, 10) || 320)),
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className={labelClass}>Мин. высота (px)</label>
                  <input
                    type="number"
                    min={32}
                    max={120}
                    value={localSettings.nodeMinHeight ?? 48}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        nodeMinHeight: Math.min(120, Math.max(32, parseInt(e.target.value, 10) || 48)),
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="mb-4">
                  <label className={labelClass}>Толщина линии (px)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={localSettings.nodeBorderWidth ?? 2}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        nodeBorderWidth: Math.min(6, Math.max(1, parseInt(e.target.value, 10) || 2)),
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="mb-4">
                  <label className={labelClass}>Толщина боковой полоски (px)</label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={localSettings.nodeLeftStripWidth ?? 3}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        nodeLeftStripWidth: Math.min(12, Math.max(2, parseInt(e.target.value, 10) || 3)),
                      })
                    }
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-muted">Только для пресета «Обычный»</p>
                </div>
                <div className="mb-4">
                  <label className={labelClass}>Выравнивание текста</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted block mb-1">По горизонтали</span>
                      <select
                        value={localSettings.nodeTextAlignH ?? 'left'}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            nodeTextAlignH: e.target.value as 'left' | 'center' | 'right',
                          })
                        }
                        className={inputClass}
                      >
                        <option value="left">Слева</option>
                        <option value="center">По центру</option>
                        <option value="right">Справа</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-xs text-muted block mb-1">По вертикали</span>
                      <select
                        value={localSettings.nodeTextAlignV ?? 'center'}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            nodeTextAlignV: e.target.value as 'top' | 'center' | 'bottom',
                          })
                        }
                        className={inputClass}
                      >
                        <option value="top">К верху</option>
                        <option value="center">По центру</option>
                        <option value="bottom">К низу</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={localSettings.nodeTextFit ?? true}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, nodeTextFit: e.target.checked })
                      }
                      className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                    />
                    <span className="text-sm text-text">Вписывать текст в ноду</span>
                  </label>
                  <p className="mt-1 text-xs text-muted">
                    Если выключено, текст может выходить за границы ноды
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Пресет оформления</label>
                  <div className="space-y-2">
                    {NODE_VISUAL_PRESETS.map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 cursor-pointer text-text hover:text-accent transition-colors"
                      >
                        <input
                          type="radio"
                          name="nodeVisualPreset"
                          value={value}
                          checked={(localSettings.nodeVisualPreset ?? 'default') === value}
                          onChange={() =>
                            setLocalSettings({ ...localSettings, nodeVisualPreset: value })
                          }
                          className="w-4 h-4 border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-panel-border pt-4">
                <h3 className="text-sm font-medium text-text mb-2">Предпросмотр</h3>
                <p className="text-xs text-muted mb-2">
                  Как будет выглядеть нода с текущим шаблоном и выбранным визуалом:
                </p>
                <NodePreview settings={localSettings} notionFieldColors={notionFieldColors} />
              </div>

              <div>
                <h3 className="text-sm font-medium text-text mb-2">Доступные заполнители</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {placeholders.map(({ key, desc }) => (
                    <div key={key} className="flex items-start gap-2">
                      <code className="text-xs bg-control-bg-muted px-1.5 py-0.5 rounded-small text-text border border-control-border-muted shrink-0">
                        {key}
                      </code>
                      <span className="text-muted text-xs">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-panel-2 border border-panel-border rounded-control p-3">
                <h4 className="text-xs font-semibold text-text mb-1">Пример:</h4>
                <pre className="text-xs font-mono text-muted whitespace-pre-wrap">
                  {localSettings.nodeTemplate || '%label%\n%act% %stage% | %category%'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4">
              <p className="text-sm text-muted mb-4">
                Оптимизация отрисовки для больших графов (200+ узлов). Эти настройки помогают
                улучшить производительность при работе со сложными деревьями технологий.
              </p>

              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={localSettings.renderSimplification}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      renderSimplification: e.target.checked,
                    })
                  }
                  className="w-4 h-4 mt-0.5 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0 group-hover:border-accent transition-colors"
                />
                <div>
                  <span className="text-sm font-medium text-text group-hover:text-accent transition-colors">Включить упрощение отрисовки</span>
                  <p className="text-xs text-muted mt-0.5">
                    Автоматически упрощает отрисовку узлов в зависимости от уровня масштаба и сложности
                  </p>
                </div>
              </label>

              <div className="bg-control-bg-muted border border-panel-border rounded-control p-3 text-sm text-text">
                <p>
                  <strong className="text-text">Примечание:</strong>{' '}
                  <span className="text-muted">
                    Дополнительные опции производительности (LOD, фильтрация связей, просмотр окрестности)
                    будут доступны в будущем обновлении.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-panel-border bg-panel-2 rounded-b-[16px]">
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
            Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
};
