import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';

const inputClass =
  'w-full border border-control-border rounded-control px-2.5 py-1.5 text-sm bg-control-bg text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors';
const labelClass = 'block text-sm font-medium text-muted mb-2';

export const SettingsModal = () => {
  const isOpen = useStore((state) => state.modals.settings);
  const settings = useStore((state) => state.settings);
  const theme = useStore((state) => state.ui.theme);
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
    { key: '%RuName%', desc: 'Русское название' },
    { key: '%Act%', desc: 'Номер акта' },
    { key: '%Stage%', desc: 'Номер стадии' },
    { key: '%Category%', desc: 'Название категории' },
    { key: '%formulaResultInCraft%', desc: 'Результат крафта' },
    { key: '%ItemInGameStatus%', desc: 'Игровой статус' },
    { key: '%ItemDesignStatus%', desc: 'Статус дизайна' },
    { key: '%formulaIngridients%', desc: 'Ингредиенты' },
    { key: '%formulaCraftStation%', desc: 'Станция крафта' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'var(--modal-overlay)' }}
    >
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-full max-w-2xl max-h-[80vh] flex flex-col transition-colors">
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

        <div className="flex border-b border-panel-border overflow-x-auto">
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
                  placeholder="%RuName%\n%Act% %Stage% | %Category%"
                />
                <p className="mt-1 text-xs text-muted">
                  Используйте заполнители типа %RuName%, %Act% и т.д. Неизвестные заполнители будут пустыми.
                </p>
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
                  {localSettings.nodeTemplate || '%RuName%\n%Act% %Stage% | %Category%'}
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
