import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Download, Upload, CheckCircle, AlertCircle, Loader2, Unplug, Plug } from 'lucide-react';
import { useStore } from '../store/useStore';
import { NotionConfig, NotionColumnMapping } from '../types';
import { testNotionConnection, pullFromNotion, pushToNotion, bidirectionalSync, NOTION_BUILTIN_PROXY } from '../utils/notionApi';
import { getLayoutedElements } from '../utils/autoLayout';

const DEFAULT_COLUMN_MAPPING: NotionColumnMapping = {
  workingName: 'WorkingName',
  techCraftId: 'TechCraftID',
  actAndStage: 'ActAndStage',
  actStage: 'ActStage',
  category: 'CategoryFromItem',
  prevTechs: 'PrevTechs',
  nextTechs: 'NextTechs',
  ingredients: 'Ingridients',
  usedStation: 'UsedStation',
  outputItem: 'OutputItem',
  powerType: 'CraftStationPowerType',
  gameStatus: 'CraftStatusInGame',
  designStatus: 'TechCraftDesignStatus',
  notionSyncStatus: 'TechCraftNotionStatus',
  editorPosition: 'EditorPosition',
};

type Step = 'connect' | 'mapping' | 'sync' | 'result';

export const NotionSyncModal = () => {
  const isOpen = useStore((s) => s.modals.notionSync);
  const setModalOpen = useStore((s) => s.setModalOpen);
  const notionConfig = useStore((s) => s.notionConfig);
  const setNotionConfig = useStore((s) => s.setNotionConfig);
  const notionCorsProxy = useStore((s) => s.notionCorsProxy);
  const setNotionCorsProxy = useStore((s) => s.setNotionCorsProxy);
  const setNotionConnected = useStore((s) => s.setNotionConnected);
  const syncInProgress = useStore((s) => s.syncInProgress);
  const setSyncInProgress = useStore((s) => s.setSyncInProgress);
  const setLastSyncResult = useStore((s) => s.setLastSyncResult);
  const setLastSyncTime = useStore((s) => s.setLastSyncTime);
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const setNodes = useStore((s) => s.setNodes);
  const setEdges = useStore((s) => s.setEdges);
  const settings = useStore((s) => s.settings);
  const notionSourceOfTruth = useStore((s) => s.notionSourceOfTruth);
  const setNotionSourceOfTruth = useStore((s) => s.setNotionSourceOfTruth);

  const [step, setStep] = useState<Step>(notionConfig ? 'sync' : 'connect');
  const [apiKey, setApiKey] = useState(notionConfig?.apiKey || '');
  const [databaseId, setDatabaseId] = useState(notionConfig?.databaseId || '');
  const [corsProxy, setCorsProxy] = useState(notionCorsProxy);
  const [mapping, setMapping] = useState<NotionColumnMapping>(
    notionConfig?.columnMapping || { ...DEFAULT_COLUMN_MAPPING }
  );
  const [dbProperties, setDbProperties] = useState<string[]>([]);
  const [dbTitle, setDbTitle] = useState('');

  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(notionConfig ? 'sync' : 'connect');
      setApiKey(notionConfig?.apiKey || '');
      setDatabaseId(notionConfig?.databaseId || '');
      setCorsProxy(
        import.meta.env.DEV && !notionCorsProxy?.trim()
          ? NOTION_BUILTIN_PROXY
          : (notionCorsProxy ?? '')
      );
      setMapping(notionConfig?.columnMapping || { ...DEFAULT_COLUMN_MAPPING });
      setSyncLog([]);
      setSyncResult(null);
    }
  }, [isOpen]);

  const getEffectiveProxy = (): string | undefined => {
    if (corsProxy === NOTION_BUILTIN_PROXY) return NOTION_BUILTIN_PROXY;
    if (corsProxy?.trim()) return corsProxy.trim();
    if (import.meta.env.DEV) return NOTION_BUILTIN_PROXY;
    return undefined;
  };

  const formatNotionError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
      return "Cannot reach Notion. If you're running in the browser, set a CORS proxy in the Notion Sync settings or use the built-in proxy (dev only).";
    }
    return msg;
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestError('');
    try {
      const res = await testNotionConnection(databaseId, apiKey, getEffectiveProxy());
      if (res.success) {
        setDbTitle(res.title || '');
        setDbProperties(res.properties || []);
        setStep('mapping');
      } else {
        setTestError(res.error || 'Connection failed');
      }
    } catch (err: unknown) {
      setTestError(formatNotionError(err));
    }
    setTesting(false);
  };

  const handleSaveConfig = () => {
    const config: NotionConfig = {
      apiKey,
      databaseId,
      columnMapping: mapping,
    };
    setNotionConfig(config);
    setNotionCorsProxy(corsProxy);
    setNotionConnected(true);
    setNotionSourceOfTruth(true); // Enable by default on first connect
    setStep('sync');
  };

  const handleDisconnect = () => {
    setNotionConfig(null);
    setNotionConnected(false);
    setStep('connect');
    setApiKey('');
    setDatabaseId('');
    setDbTitle('');
  };

  const addLog = (msg: string) => {
    setSyncLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handlePull = async () => {
    if (!notionConfig) return;
    setSyncInProgress(true);
    setSyncLog([]);
    setSyncResult(null);
    setStep('result');

    try {
      addLog('Подключение к Notion...');
      const { nodes: pulledNodes, edges: pulledEdges } = await pullFromNotion(
        notionConfig,
        getEffectiveProxy()
      );
      addLog(`Получено ${pulledNodes.length} узлов и ${pulledEdges.length} связей`);

      // Use stored positions from Notion if available, otherwise auto-layout
      const hasPositions = pulledNodes.some(n => n.position.x !== 0 || n.position.y !== 0);
      if (hasPositions) {
        addLog('Позиції завантажено з Notion');
        setNodes(pulledNodes);
        setEdges(pulledEdges);
      } else {
        addLog('Авто-розміщення...');
        const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
          pulledNodes,
          pulledEdges,
          settings.layoutDirection
        );
        setNodes(layouted);
        setEdges(layoutedEdges);
      }

      const result = { added: pulledNodes.length, updated: 0, deleted: 0, conflicts: [], errors: [] };
      setSyncResult(result);
      setLastSyncResult(result);
      setLastSyncTime(new Date().toISOString());
      addLog('Pull завершён успешно');
    } catch (err: unknown) {
      const msg = formatNotionError(err);
      addLog(`Ошибка: ${msg}`);
      setSyncResult({ added: 0, updated: 0, deleted: 0, conflicts: [], errors: [msg] });
    }
    setSyncInProgress(false);
  };

  const handlePush = async () => {
    if (!notionConfig) return;
    setSyncInProgress(true);
    setSyncLog([]);
    setSyncResult(null);
    setStep('result');

    try {
      addLog(`Отправка ${nodes.length} узлов в Notion...`);
      const result = await pushToNotion(nodes, edges, notionConfig, getEffectiveProxy());
      addLog(`Создано: ${result.added}, Обновлено: ${result.updated}`);
      if (result.errors.length > 0) {
        result.errors.forEach((e) => addLog(`Ошибка: ${e}`));
      }
      setSyncResult(result);
      setLastSyncResult(result);
      setLastSyncTime(new Date().toISOString());
      addLog('Push завершён');
    } catch (err: unknown) {
      const msg = formatNotionError(err);
      addLog(`Ошибка: ${msg}`);
      setSyncResult({ added: 0, updated: 0, deleted: 0, conflicts: [], errors: [msg] });
    }
    setSyncInProgress(false);
  };

  const handleBidirectional = async () => {
    if (!notionConfig) return;
    setSyncInProgress(true);
    setSyncLog([]);
    setSyncResult(null);
    setStep('result');

    try {
      addLog('Двусторонняя синхронизация...');
      const { mergedNodes, mergedEdges, result } = await bidirectionalSync(
        nodes,
        edges,
        notionConfig,
        getEffectiveProxy()
      );
      addLog(`Добавлено: ${result.added}, Обновлено: ${result.updated}`);

      // Auto-layout new nodes
      const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
        mergedNodes,
        mergedEdges,
        settings.layoutDirection
      );

      setNodes(layouted);
      setEdges(layoutedEdges);

      setSyncResult(result);
      setLastSyncResult(result);
      setLastSyncTime(new Date().toISOString());
      addLog('Синхронизация завершена');
    } catch (err: unknown) {
      const msg = formatNotionError(err);
      addLog(`Ошибка: ${msg}`);
      setSyncResult({ added: 0, updated: 0, deleted: 0, conflicts: [], errors: [msg] });
    }
    setSyncInProgress(false);
  };

  if (!isOpen) return null;

  const useBuiltInProxy = corsProxy === NOTION_BUILTIN_PROXY;

  const renderMappingSelect = (label: string, key: keyof NotionColumnMapping) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select
        className="w-full border rounded px-2 py-1 text-sm"
        value={mapping[key]}
        onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
      >
        <option value="">(None)</option>
        {dbProperties.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[650px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center">
            <span className="mr-2">Notion Sync</span>
            {notionConfig && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Подключено
              </span>
            )}
          </h2>
          <button onClick={() => setModalOpen('notionSync', false)} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Connect */}
          {step === 'connect' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Подключите вашу базу данных Notion для синхронизации дерева технологий.
                Вам понадобится Integration Token и ID базы данных.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notion Integration Token
                </label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="ntn_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Создайте интеграцию на notion.so/my-integrations и добавьте её к базе данных
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database ID
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm font-mono"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  ID базы данных из URL: notion.so/[workspace]/[database_id]?v=...
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <input
                    type="checkbox"
                    checked={useBuiltInProxy}
                    onChange={(e) => setCorsProxy(e.target.checked ? NOTION_BUILTIN_PROXY : '')}
                    className="rounded border-gray-300"
                  />
                  Use built-in proxy (dev only)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  When running with <code className="bg-gray-100 px-1 rounded">npm run dev</code>, the app proxies requests to Notion so you don&apos;t need an external CORS proxy.
                </p>
                {!useBuiltInProxy && (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CORS Proxy (опционально)
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder="https://your-cors-proxy.com/"
                      value={corsProxy}
                      onChange={(e) => setCorsProxy(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Notion API не поддерживает CORS из браузера. Укажите адрес прокси-сервера или включите встроенный прокси выше.
                    </p>
                    {import.meta.env.DEV && (
                      <p className="text-xs text-gray-500 mt-1">
                        В режиме dev при пустом поле используется встроенный прокси.
                      </p>
                    )}
                  </>
                )}
              </div>

              {testError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-start">
                  <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                  {testError}
                </div>
              )}
            </div>
          )}

          {/* Step: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-600" />
                <span>Подключено к: <strong>{dbTitle}</strong> ({dbProperties.length} свойств)</span>
              </div>

              <p className="text-sm text-gray-600">
                Сопоставьте свойства Notion с полями нод:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {renderMappingSelect('Название (Title)', 'workingName')}
                {renderMappingSelect('TechCraft ID', 'techCraftId')}
                {renderMappingSelect('Акт и Стадия', 'actAndStage')}
                {renderMappingSelect('Стадия', 'actStage')}
                {renderMappingSelect('Категория', 'category')}
                {renderMappingSelect('Пред. технологии (Relation)', 'prevTechs')}
                {renderMappingSelect('След. технологии (Relation)', 'nextTechs')}
                {renderMappingSelect('Ингредиенты (Relation)', 'ingredients')}
                {renderMappingSelect('Станция крафта (Relation)', 'usedStation')}
                {renderMappingSelect('Выходной предмет (Relation)', 'outputItem')}
                {renderMappingSelect('Тип питания', 'powerType')}
                {renderMappingSelect('Статус в игре', 'gameStatus')}
                {renderMappingSelect('Статус дизайна', 'designStatus')}
                {renderMappingSelect('Статус Notion', 'notionSyncStatus')}
                {renderMappingSelect('Позиция в редакторе', 'editorPosition')}
              </div>
            </div>
          )}

          {/* Step: Sync */}
          {step === 'sync' && (
            <div className="space-y-4">
              {notionConfig && (
                <div className="bg-gray-50 border rounded p-3 text-sm space-y-1">
                  <div><span className="font-medium">Database:</span> {notionConfig.databaseId.slice(0, 8)}...</div>
                  <div><span className="font-medium">API Key:</span> {notionConfig.apiKey.slice(0, 8)}...</div>
                </div>
              )}

              <p className="text-sm text-gray-600">Выберите направление синхронизации:</p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handlePull}
                  disabled={syncInProgress}
                  className="flex items-center p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <Download size={24} className="text-blue-500 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Pull (Notion → Редактор)</div>
                    <div className="text-xs text-gray-500">Загрузить все данные из Notion в редактор. Текущие данные будут заменены.</div>
                  </div>
                </button>

                <button
                  onClick={handlePush}
                  disabled={syncInProgress || nodes.length === 0}
                  className="flex items-center p-4 border-2 rounded-lg hover:border-green-500 hover:bg-green-50 transition disabled:opacity-50"
                >
                  <Upload size={24} className="text-green-500 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Push (Редактор → Notion)</div>
                    <div className="text-xs text-gray-500">Отправить локальные данные в Notion. Существующие записи обновятся, новые создадутся.</div>
                  </div>
                </button>

                <button
                  onClick={handleBidirectional}
                  disabled={syncInProgress}
                  className="flex items-center p-4 border-2 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition disabled:opacity-50"
                >
                  <RefreshCw size={24} className="text-purple-500 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Bidirectional (Двусторонняя)</div>
                    <div className="text-xs text-gray-500">Объединить данные: более новая версия побеждает. Новые записи добавляются с обеих сторон.</div>
                  </div>
                </button>
              </div>

              {/* Source of Truth toggle */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <label className="flex items-center gap-2 text-sm font-medium text-purple-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notionSourceOfTruth}
                    onChange={(e) => setNotionSourceOfTruth(e.target.checked)}
                    className="rounded border-purple-300"
                  />
                  Notion як джерело правди (автозбереження)
                </label>
                <p className="text-xs text-purple-600 mt-1">
                  Зміни автоматично зберігатимуться в Notion, включаючи позиції нод.
                </p>
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <button
                  onClick={() => setStep('mapping')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Изменить маппинг
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center text-sm text-red-500 hover:text-red-700"
                >
                  <Unplug size={14} className="mr-1" />
                  Отключить
                </button>
              </div>
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && (
            <div className="space-y-4">
              {syncInProgress && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 size={24} className="animate-spin text-blue-500 mr-3" />
                  <span className="text-gray-600">Синхронизация...</span>
                </div>
              )}

              {/* Log */}
              <div className="bg-gray-900 rounded p-3 text-xs font-mono text-green-400 max-h-48 overflow-y-auto">
                {syncLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {syncLog.length === 0 && <div className="text-gray-500">Ожидание...</div>}
              </div>

              {/* Result summary */}
              {syncResult && !syncInProgress && (
                <div className={`border rounded p-4 ${syncResult.errors?.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center">
                      {syncResult.errors?.length > 0
                        ? <AlertCircle size={16} className="mr-2 text-yellow-600" />
                        : <CheckCircle size={16} className="mr-2 text-green-600" />
                      }
                      <span className="font-medium">
                        {syncResult.errors?.length > 0 ? 'Завершено с ошибками' : 'Успешно'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 ml-6">
                      Добавлено: {syncResult.added} | Обновлено: {syncResult.updated}
                      {syncResult.errors?.length > 0 && ` | Ошибок: ${syncResult.errors.length}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          {step === 'connect' && (
            <button
              onClick={handleTestConnection}
              disabled={!apiKey || !databaseId || testing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {testing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plug size={16} className="mr-2" />}
              Подключить
            </button>
          )}

          {step === 'mapping' && (
            <>
              <button
                onClick={() => setStep('connect')}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Назад
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Сохранить и продолжить
              </button>
            </>
          )}

          {step === 'result' && !syncInProgress && (
            <button
              onClick={() => setStep('sync')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Вернуться к синхронизации
            </button>
          )}

          <button
            onClick={() => setModalOpen('notionSync', false)}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
