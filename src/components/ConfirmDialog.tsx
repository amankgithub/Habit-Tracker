import { useEffect } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  options: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[];
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, options, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-backdrop-in"
      onClick={onCancel}
    >
      <div
        className="bg-surface border border-border rounded-card shadow-card p-5 w-80 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-[15px] text-text mb-2">{title}</h3>
        <p className="font-ui text-[13px] text-textMuted mb-4">{message}</p>
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={opt.onClick}
              className={`w-full py-2 rounded-cell text-[13px] font-ui transition-colors active:scale-[0.98]
                ${
                  opt.variant === 'danger'
                    ? 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/30'
                    : 'bg-accent text-bg hover:bg-accent/90 font-medium'
                }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 rounded-cell text-[13px] font-ui text-textMuted hover:text-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
