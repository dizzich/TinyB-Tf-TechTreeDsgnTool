import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';

export const SettingsModal = () => {
  const isOpen = useStore((state) => state.modals.settings);
  const settings = useStore((state) => state.settings);
  const setModalOpen = useStore((state) => state.setModalOpen);
  const updateSettings = useStore((state) => state.updateSettings);

  const [activeTab, setActiveTab] = useState<'general' | 'template' | 'performance'>('general');
  const [localSettings, setLocalSettings] = useState(settings);

  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    setModalOpen('settings', false);
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    setModalOpen('settings', false);
  };

  const tabNames = {
    general: 'Основные',
    template: 'Шаблон',
    performance: 'Производительность'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Настройки</h2>
          <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['general', 'template', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tabNames[tab]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Направление размещения
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
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
                      className="mr-2"
                    />
                    <span>Слева направо (LR)</span>
                  </label>
                  <label className="flex items-center">
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
                      className="mr-2"
                    />
                    <span>Сверху вниз (TB)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Шаблон подписи узла
                </label>
                <textarea
                  value={localSettings.nodeTemplate}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, nodeTemplate: e.target.value })
                  }
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder="%RuName%\n%Act% %Stage% | %Category%"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Используйте заполнители типа %RuName%, %Act% и т.д. Неизвестные заполнители будут пустыми.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Доступные заполнители</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {placeholders.map(({ key, desc }) => (
                    <div key={key} className="flex items-start">
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded mr-2">{key}</code>
                      <span className="text-gray-600 text-xs">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-1">Пример:</h4>
                <pre className="text-xs font-mono text-blue-800 whitespace-pre-wrap">
                  {localSettings.nodeTemplate || '%RuName%\n%Act% %Stage% | %Category%'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Оптимизация отрисовки для больших графов (200+ узлов). Эти настройки помогают
                улучшить производительность при работе со сложными деревьями технологий.
              </p>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.renderSimplification}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      renderSimplification: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <div>
                  <span className="text-sm font-medium">Включить упрощение отрисовки</span>
                  <p className="text-xs text-gray-500">
                    Автоматически упрощает отрисовку узлов в зависимости от уровня масштаба и сложности
                  </p>
                </div>
              </label>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                <p className="text-yellow-900">
                  <strong>Примечание:</strong> Дополнительные опции производительности (LOD, фильтрация связей,
                  просмотр окрестности) будут доступны в будущем обновлении.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
          >
            Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
};
