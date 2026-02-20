import React, { useState } from 'react';
import { useStore } from '../store/useStore';

const modalOverlay = 'fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-[4px]';
const btnPrimary =
  'px-4 py-2.5 bg-accent text-[#0f141c] rounded-control font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors';
const btnSecondary =
  'px-4 py-2.5 bg-control-bg border border-control-border rounded-control text-text font-medium hover:bg-control-hover-bg hover:border-control-hover-border disabled:opacity-50 transition-colors';

export const UnsavedChangesModal = () => {
  const isOpen = useStore((s) => s.modals.unsavedChanges);
  const setModalOpen = useStore((s) => s.setModalOpen);
  const unsavedChangesResolve = useStore((s) => s.unsavedChangesResolve);
  const setUnsavedChangesResolve = useStore((s) => s.setUnsavedChangesResolve);

  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleStay = () => {
    setModalOpen('unsavedChanges', false);
    setUnsavedChangesResolve(null);
    unsavedChangesResolve?.(false, false);
  };

  const handleExit = () => {
    setModalOpen('unsavedChanges', false);
    setUnsavedChangesResolve(null);
    unsavedChangesResolve?.(true, dontShowAgain);
  };

  return (
    <div className={modalOverlay} style={{ background: 'var(--modal-overlay)' }}>
      <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-full max-w-md p-6 transition-colors">
        <h2 className="text-lg font-semibold text-text mb-3">Выйти без сохранения?</h2>
        <p className="text-sm text-muted mb-6">
          У вас есть несохранённые изменения. Они будут потеряны при выходе.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={handleStay} className={btnSecondary}>
              Остаться
            </button>
            <button type="button" onClick={handleExit} className={btnPrimary}>
              Выйти без сохранения
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded-small border-control-border bg-control-bg text-accent focus:ring-accent focus:ring-offset-0"
            />
            Не показывать до следующего запуска
          </label>
        </div>
      </div>
    </div>
  );
};
