import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Download, Upload, CheckCircle, AlertCircle, Loader2, Unplug, Plug } from 'lucide-react';
import { useStore } from '../store/useStore';
import { NotionConfig, NotionColumnMapping } from '../types';
import { testNotionConnection, pullFromNotionIncremental, pushToNotion, bidirectionalSync, checkForNotionUpdates, NOTION_BUILTIN_PROXY } from '../utils/notionApi';
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
  const setSyncProgress = useStore((s) => s.setSyncProgress);
  const setLastSyncResult = useStore((s) => s.setLastSyncResult);
  const setLastSyncTime = useStore((s) => s.setLastSyncTime);
  const setLastSyncError = useStore((s) => s.setLastSyncError);
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const replaceNodesAndEdgesForSync = useStore((s) => s.replaceNodesAndEdgesForSync);
  const settings = useStore((s) => s.settings);
  const notionSourceOfTruth = useStore((s) => s.notionSourceOfTruth);
  const setNotionSourceOfTruth = useStore((s) => s.setNotionSourceOfTruth);
  const setNotionDirty = useStore((s) => s.setNotionDirty);
  const setNotionHasRemoteUpdates = useStore((s) => s.setNotionHasRemoteUpdates);
  const notionHasRemoteUpdates = useStore((s) => s.notionHasRemoteUpdates);
  const lastSyncTime = useStore((s) => s.lastSyncTime);
  const syncProgress = useStore((s) => s.syncProgress);
  const clearDirtyNodes = useStore((s) => s.clearDirtyNodes);
  const dirtyNodeIds = useStore((s) => s.dirtyNodeIds);

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
  const [checkingUpdates, setCheckingUpdates] = useState(false);
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
      const { nodes: pulledNodes, edges: pulledEdges } = await pullFromNotionIncremental(
        notionConfig,
        lastSyncTime,
        nodes,
        edges,
        getEffectiveProxy()
      );
      addLog(`Получено ${pulledNodes.length} узлов и ${pulledEdges.length} связей`);

      // Use stored positions from Notion if available, otherwise auto-layout
      const hasPositions = pulledNodes.some(n => n.position.x !== 0 || n.position.y !== 0);
      const toSet = hasPositions
        ? { nodes: pulledNodes, edges: pulledEdges }
        : getLayoutedElements(pulledNodes, pulledEdges, settings.layoutDirection);
      replaceNodesAndEdgesForSync(toSet.nodes, toSet.edges);
      addLog(hasPositions ? 'Позиції завантажено з Notion' : 'Авто-розміщення...');

      const result = { added: pulledNodes.length, updated: 0, deleted: 0, conflicts: [], errors: [] };
      setSyncResult(result);
      setLastSyncResult(result);
      setLastSyncTime(new Date().toISOString());
      setNotionHasRemoteUpdates(false);
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
    const dirty = dirtyNodeIds;
    const totalToPush = dirty.size > 0 ? dirty.size : nodes.length;
    setSyncInProgress(true);
    setSyncProgress({ current: 0, total: totalToPush });
    setSyncLog([]);
    setSyncResult(null);
    setStep('result');

    try {
      addLog(dirty.size > 0 ? `Отправка ${dirty.size} изменённых узлов...` : `Отправка ${nodes.length} узлов в Notion...`);
      const result = await pushToNotion(
        nodes,
        edges,
        notionConfig,
        getEffectiveProxy(),
        (current, total) => setSyncProgress({ current, total }),
        dirty.size > 0 ? dirty : undefined
      );
      addLog(`Создано: ${result.added}, Обновлено: ${result.updated}`);
      if (result.errors.length > 0) {
        result.errors.forEach((e) => addLog(`Ошибка: ${e}`));
      }
      setSyncResult(result);
      setLastSyncResult(result);
      setLastSyncTime(new Date().toISOString());
      setLastSyncError(null);
      setNotionDirty(false);
      setNotionHasRemoteUpdates(false);
      clearDirtyNodes();
      addLog('Push завершён');
    } catch (err: unknown) {
      const msg = formatNotionError(err);
      addLog(`Ошибка: ${msg}`);
      setLastSyncError(msg);
      setSyncResult({ added: 0, updated: 0, deleted: 0, conflicts: [], errors: [msg] });
    }
    setSyncInProgress(false);
  };

  const handleCheckUpdates = async () => {
    if (!notionConfig) return;
    setCheckingUpdates(true);
    setSyncLog([]);
    try {
      const { hasUpdates } = await checkForNotionUpdates(
        notionConfig,
        lastSyncTime,
        getEffectiveProxy()
      );
      setNotionHasRemoteUpdates(hasUpdates);
      addLog(hasUpdates ? 'В Notion есть изменения. Нажмите Pull для загрузки.' : 'Notion синхронизирован.');
    } catch (err: unknown) {
      const msg = formatNotionError(err);
      addLog(`Ошибка: ${msg}`);
    }
    setCheckingUpdates(false);
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
        getEffectiveProxy(),
        lastSyncTime
      );
      addLog(`Добавлено: ${result.added}, Обновлено: ${result.updated}`);

      // Auto-layout new nodes
      const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
        mergedNodes,
        mergedEdges,
        settings.layoutDirection
      );
      replaceNodesAndEdgesForSync(layouted, layoutedEdges);

      setSyncResult(result);
      setLastSyncResult(result);
      setLastSyncTime(new Date().toISOString());
      setNotionHasRemoteUpdates(false);
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

  const inputClass =
    'w-full border border-control-border rounded-control px-2.5 py-1.5 text-sm bg-control-bg text-text placeholder:text-muted focus:outline-none focus:border-accent';
  const labelClass = 'block text-xs font-medium text-muted mb-1';

  const renderMappingSelect = (label: string, key: keyof NotionColumnMapping) => (
    <div key={key}>
      <label className={labelClass}>{label}</label>
      <select
        className={inputClass}
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

  const btnPrimary =
    'px-4 py-2 bg-accent text-[#0f141c] rounded-control font-medium hover:bg-accent-hover disabled:opacity-50 flex items-center';
  const btnSecondary =
    'px-4 py-2 bg-control-bg border border-control-border rounded-control text-text hover:bg-control-hover-bg hover:border-control-hover-border';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[4px]"
      style={{ background: 'var(--modal-overlay)' }}
    >
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-[650px] max-h-[85vh] flex flex-col">
        <div className="modal__header p-4 border-b border-panel-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <span>Notion Sync</span>
            {notionConfig && (
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-small">
                Подключено
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setModalOpen('notionSync', false)}
            className="w-9 h-9 flex items-center justify-center rounded-control bg-control-bg-muted border border-control-border-muted text-text hover:border-control-hover-border"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="modal__content flex-1 overflow-y-auto p-6">
          {step === 'connect' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Подключите вашу базу данных Notion для синхронизации дерева технологий.
                Вам понадобится Integration Token и ID базы данных.
              </p>

              <div>
                <label className={labelClass}>Notion Integration Token</label>
                <input
                  type="password"
                  className={inputClass}
                  placeholder="ntn_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted mt-1">
                  Создайте интеграцию на notion.so/my-integrations и добавьте её к базе данных
                </p>
              </div>

              <div>
                <label className={labelClass}>Database ID</label>
                <input
                  type="text"
                  className={`${inputClass} font-mono`}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                />
                <p className="text-xs text-muted mt-1">
                  ID базы данных из URL: notion.so/[workspace]/[database_id]?v=...
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBuiltInProxy}
                    onChange={(e) => setCorsProxy(e.target.checked ? NOTION_BUILTIN_PROXY : '')}
                    className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  Use built-in proxy (dev only)
                </label>
                <p className="text-xs text-muted mb-2 mt-1">
                  When running with <code className="bg-control-bg-muted px-1 rounded-small text-text">npm run dev</code>, the app proxies requests to Notion so you don&apos;t need an external CORS proxy.
                </p>
                {!useBuiltInProxy && (
                  <>
                    <label className={labelClass}>CORS Proxy (опционально)</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="https://your-cors-proxy.com/"
                      value={corsProxy}
                      onChange={(e) => setCorsProxy(e.target.value)}
                    />
                    <p className="text-xs text-muted mt-1">
                      Notion API не поддерживает CORS из браузера. Укажите адрес прокси-сервера или включите встроенный прокси выше.
                    </p>
                    {import.meta.env.DEV && (
                      <p className="text-xs text-muted mt-1">
                        В режиме dev при пустом поле используется встроенный прокси.
                      </p>
                    )}
                  </>
                )}
              </div>

              {testError && (
                <div className="rounded-control p-3 text-sm text-danger flex items-start bg-danger/15 border border-danger/45">
                  <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                  {testError}
                </div>
              )}
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-accent/20 border border-accent/40 rounded-control p-3 text-sm flex items-center text-text">
                <CheckCircle size={16} className="mr-2 text-accent" strokeWidth={1.75} />
                <span>Подключено к: <strong>{dbTitle}</strong> ({dbProperties.length} свойств)</span>
              </div>

              <p className="text-sm text-muted">
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

          {step === 'sync' && (
            <div className="space-y-4">
              {notionConfig && (
                <div className="bg-control-bg-muted border border-panel-border rounded-control p-3 text-sm space-y-1 text-text">
                  <div><span className="font-medium text-muted">Database:</span> <span className="text-text">{notionConfig.databaseId.slice(0, 8)}...</span></div>
                  <div><span className="font-medium text-muted">API Key:</span> <span className="text-text">{notionConfig.apiKey.slice(0, 8)}...</span></div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted">Выберите направление синхронизации:</p>
                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={syncInProgress || checkingUpdates}
                  className="text-sm px-3 py-1.5 rounded-control border border-control-border bg-control-bg-muted hover:bg-control-hover-bg text-text disabled:opacity-50"
                >
                  {checkingUpdates ? 'Проверка...' : 'Проверить обновления'}
                </button>
              </div>
              {notionHasRemoteUpdates && (
                <div className="bg-amber-500/15 border border-amber-500/40 rounded-control p-2 text-sm text-amber-400">
                  В Notion есть изменения. Нажмите Pull для загрузки.
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={handlePull}
                  disabled={syncInProgress}
                  className={`flex items-center p-4 border-2 rounded-control bg-control-bg-muted hover:bg-control-hover-bg transition disabled:opacity-50 text-left ${
                    notionHasRemoteUpdates ? 'border-amber-500/60' : 'border-control-border'
                  }`}
                >
                  <Download size={24} className="text-accent mr-3 flex-shrink-0" strokeWidth={1.75} />
                  <div>
                    <div className="font-medium text-text">Pull (Notion → Редактор)</div>
                    <div className="text-xs text-muted">Загрузить все данные из Notion в редактор. Текущие данные будут заменены.</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handlePush}
                  disabled={syncInProgress || nodes.length === 0}
                  className="flex items-center p-4 border-2 border-control-border rounded-control bg-control-bg-muted hover:border-accent hover:bg-control-hover-bg transition disabled:opacity-50 text-left"
                >
                  <Upload size={24} className="text-accent mr-3 flex-shrink-0" strokeWidth={1.75} />
                  <div>
                    <div className="font-medium text-text">Push (Редактор → Notion)</div>
                    <div className="text-xs text-muted">Отправить локальные данные в Notion. Существующие записи обновятся, новые создадутся.</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleBidirectional}
                  disabled={syncInProgress}
                  className="flex items-center p-4 border-2 border-control-border rounded-control bg-control-bg-muted hover:border-accent hover:bg-control-hover-bg transition disabled:opacity-50 text-left"
                >
                  <RefreshCw size={24} className="text-accent mr-3 flex-shrink-0" strokeWidth={1.75} />
                  <div>
                    <div className="font-medium text-text">Bidirectional (Двусторонняя)</div>
                    <div className="text-xs text-muted">Объединить данные: более новая версия побеждает. Новые записи добавляются с обеих сторон.</div>
                  </div>
                </button>
              </div>

              <div className="p-3 bg-panel-2 border border-panel-border rounded-control">
                <label className="flex items-center gap-2 text-sm font-medium text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notionSourceOfTruth}
                    onChange={(e) => setNotionSourceOfTruth(e.target.checked)}
                    className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  Notion як джерело правди (автозбереження)
                </label>
                <p className="text-xs text-muted mt-1">
                  Зміни автоматично зберігатимуться в Notion, включаючи позиції нод.
                </p>
              </div>

              <div className="pt-2 border-t border-panel-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="text-sm text-muted hover:text-text"
                >
                  Изменить маппинг
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex items-center text-sm text-danger hover:opacity-90"
                >
                  <Unplug size={14} className="mr-1" strokeWidth={1.75} />
                  Отключить
                </button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              {syncInProgress && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 size={24} className="animate-spin text-accent mr-3" strokeWidth={1.75} />
                  <span className="text-muted">
                    {syncProgress
                      ? `Синхронизация ${syncProgress.current}/${syncProgress.total}...`
                      : 'Синхронизация...'}
                  </span>
                </div>
              )}

              <div className="bg-control-bg border border-control-border rounded-control p-3 text-xs font-mono text-text max-h-48 overflow-y-auto">
                {syncLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {syncLog.length === 0 && <div className="text-muted">Ожидание...</div>}
              </div>

              {syncResult && !syncInProgress && (
                <div
                  className={`border rounded-control p-4 ${
                    syncResult.errors?.length > 0
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'bg-accent/20 border-accent/40 text-text'
                  }`}
                >
                  <div className="text-sm space-y-1">
                    <div className="flex items-center">
                      {syncResult.errors?.length > 0 ? (
                        <AlertCircle size={16} className="mr-2 text-amber-400" strokeWidth={1.75} />
                      ) : (
                        <CheckCircle size={16} className="mr-2 text-accent" strokeWidth={1.75} />
                      )}
                      <span className="font-medium">
                        {syncResult.errors?.length > 0 ? 'Завершено с ошибками' : 'Успешно'}
                      </span>
                    </div>
                    <div className="text-xs text-muted ml-6">
                      Добавлено: {syncResult.added} | Обновлено: {syncResult.updated}
                      {syncResult.errors?.length > 0 && ` | Ошибок: ${syncResult.errors.length}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-panel-border flex justify-end gap-2 bg-panel-2 rounded-b-[16px]">
          {step === 'connect' && (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={!apiKey || !databaseId || testing}
              className={btnPrimary}
            >
              {testing ? <Loader2 size={16} className="animate-spin mr-2" strokeWidth={1.75} /> : <Plug size={16} className="mr-2" strokeWidth={1.75} />}
              Подключить
            </button>
          )}

          {step === 'mapping' && (
            <>
              <button type="button" onClick={() => setStep('connect')} className={btnSecondary}>
                Назад
              </button>
              <button type="button" onClick={handleSaveConfig} className={btnPrimary}>
                Сохранить и продолжить
              </button>
            </>
          )}

          {step === 'result' && !syncInProgress && (
            <button type="button" onClick={() => setStep('sync')} className={btnPrimary}>
              Вернуться к синхронизации
            </button>
          )}

          <button
            type="button"
            onClick={() => setModalOpen('notionSync', false)}
            className={btnSecondary}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
