import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { ConfirmDialog } from './ConfirmDialog';
import { ContextMenu, type ContextMenuEntry } from './ContextMenu';

interface ArchivedHabitsModalProps {
  onClose: () => void;
}

/**
 * Archived habits were previously a dead end in the UI — archiveHabit hid
 * them from every view with no way back short of hand-editing data.json.
 * This surfaces them with a restore path, and still allows a permanent
 * delete for habits the user actually wants gone for good.
 */
export function ArchivedHabitsModal({ onClose }: ArchivedHabitsModalProps) {
  const habits = useAppStore((s) => s.data.habits);
  const unarchiveHabit = useAppStore((s) => s.unarchiveHabit);
  const deleteHabitPermanently = useAppStore((s) => s.deleteHabitPermanently);

  const [menu, setMenu] = useState<{ x: number; y: number; habitId: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const archived = [...habits]
    .filter((h) => h.archivedAt !== null)
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));

  const confirmTarget = confirmDeleteId ? habits.find((h) => h.id === confirmDeleteId) : null;

  // Escape closes the modal — unless the confirm dialog is up, which gets
  // its own dismiss so Escape peels off one layer at a time (matches
  // HabitModal's delete-confirm layering).
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !confirmTarget) onClose();
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [confirmTarget, onClose]);

  function menuItemsFor(habitId: string): ContextMenuEntry[] {
    return [
      { label: 'Restore', onClick: () => unarchiveHabit(habitId) },
      { type: 'separator' },
      { label: 'Delete Permanently', variant: 'danger', onClick: () => setConfirmDeleteId(habitId) },
    ];
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-card shadow-card p-5 w-96 max-h-[70vh] flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[16px] text-text">Archived Habits</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-6 h-6 flex items-center justify-center rounded-cell text-textMuted hover:text-text transition-colors"
          >
            ✕
          </button>
        </div>

        {archived.length === 0 ? (
          <p className="font-ui text-[13px] text-textMuted py-6 text-center">
            No archived habits. Archive a habit from its edit menu and it'll show up here.
          </p>
        ) : (
          <ul className="overflow-y-auto -mx-2 px-2 space-y-1">
            {archived.map((habit) => (
              <li
                key={habit.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, habitId: habit.id });
                }}
                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-cell hover:bg-surfaceRaised/60 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="font-ui text-[13px] text-text whitespace-normal break-words">{habit.name}</p>
                  <p className="font-ui text-[11px] text-textMuted">Archived {habit.archivedAt}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => unarchiveHabit(habit.id)}
                    className="px-2 py-1 rounded-cell text-[12px] font-ui text-accent hover:bg-accent/10 transition-colors"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      setMenu({ x: e.clientX, y: e.clientY, habitId: habit.id });
                    }}
                    aria-label="More actions"
                    className="w-6 h-6 flex items-center justify-center rounded-cell text-textMuted hover:text-text transition-colors"
                  >
                    ⋮
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItemsFor(menu.habitId)} onClose={() => setMenu(null)} />
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={`Delete "${confirmTarget.name}"?`}
          message="This permanently removes the habit and all of its completion history — this can't be undone."
          options={[
            {
              label: 'Delete Permanently',
              variant: 'danger',
              onClick: () => {
                deleteHabitPermanently(confirmTarget.id);
                setConfirmDeleteId(null);
              },
            },
          ]}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
