import { useStore } from '../store/useStore';

const modalOverlay = 'fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-[4px]';
const btnPrimary =
    'px-4 py-2.5 bg-accent text-[#0f141c] rounded-control font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors';
const btnSecondary =
    'px-4 py-2.5 bg-control-bg border border-control-border rounded-control text-text font-medium hover:bg-control-hover-bg hover:border-control-hover-border disabled:opacity-50 transition-colors';

export const SaveConfirmModal = () => {
    const isOpen = useStore((s) => s.modals.saveConfirm);
    const setModalOpen = useStore((s) => s.setModalOpen);
    const saveConfirmResolve = useStore((s) => s.saveConfirmResolve);
    const setSaveConfirmResolve = useStore((s) => s.setSaveConfirmResolve);

    if (!isOpen) return null;

    const handleSaveToSame = () => {
        setModalOpen('saveConfirm', false);
        setSaveConfirmResolve(null);
        saveConfirmResolve?.(false);
    };

    const handleSaveToNew = () => {
        setModalOpen('saveConfirm', false);
        setSaveConfirmResolve(null);
        saveConfirmResolve?.(true);
    };

    const handleCancel = () => {
        setModalOpen('saveConfirm', false);
        setSaveConfirmResolve(null);
        saveConfirmResolve?.(null);
    };

    return (
        <div className={modalOverlay} style={{ background: 'var(--modal-overlay)' }}>
            <div className="bg-modal-bg border border-modal-border rounded-[16px] shadow-modal w-full max-w-md p-6 transition-colors">
                <h2 className="text-lg font-semibold text-text mb-3">Сохранить проект</h2>
                <p className="text-sm text-muted mb-6">
                    Вы хотите сохранить изменения в текущий локальный файл или создать новый?
                </p>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-3 justify-end mt-2">
                        <button type="button" onClick={handleCancel} className={btnSecondary}>
                            Отмена
                        </button>
                        <button type="button" onClick={handleSaveToNew} className={btnSecondary}>
                            В новый файл
                        </button>
                        <button type="button" onClick={handleSaveToSame} className={btnPrimary}>
                            В текущий
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
