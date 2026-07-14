import { useEffect, useState } from 'react';
import type { Habit, ScheduleConfig, ScheduleType } from '../domain/types';
import { useAppStore } from '../store/appStore';
import { ScheduleTypePicker } from './habitForm/ScheduleTypePicker';
import { ConfirmDialog } from './ConfirmDialog';

interface HabitModalProps {
  habit?: Habit; // present = edit mode, absent = create mode
  onClose: () => void;
}

function activeRuleOf(habit: Habit) {
  return habit.scheduleHistory.find((r) => r.effectiveTo === null) ?? habit.scheduleHistory.at(-1)!;
}

export function HabitModal({ habit, onClose }: HabitModalProps) {
  const isEdit = !!habit;
  const addHabit = useAppStore((s) => s.addHabit);
  const updateSchedule = useAppStore((s) => s.updateHabitSchedule);
  const renameHabit = useAppStore((s) => s.renameHabit);
  const archiveHabit = useAppStore((s) => s.archiveHabit);
  const deleteHabitPermanently = useAppStore((s) => s.deleteHabitPermanently);

  const initialRule = habit ? activeRuleOf(habit) : null;

  const [name, setName] = useState(habit?.name ?? '');
  const [type, setType] = useState<ScheduleType>(initialRule?.type ?? 'daily');
  const [config, setConfig] = useState<ScheduleConfig>(initialRule?.config ?? {});
  const [confirmMode, setConfirmMode] = useState<'delete' | null>(null);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  function handleSave() {
    if (!canSave) return;
    if (isEdit && habit) {
      if (trimmedName !== habit.name) renameHabit(habit.id, trimmedName);
      const currentRule = activeRuleOf(habit);
      const scheduleChanged =
        currentRule.type !== type || JSON.stringify(currentRule.config) !== JSON.stringify(config);
      if (scheduleChanged) updateSchedule(habit.id, type, config);
    } else {
      addHabit({ name: trimmedName, type, config });
    }
    onClose();
  }

  function handleArchive() {
    if (habit) archiveHabit(habit.id);
    onClose();
  }

  function handleDeleteConfirmed() {
    if (habit) deleteHabitPermanently(habit.id);
    onClose();
  }

  // Escape closes the modal (unless the confirm dialog is up — that gets
  // its own dismiss so Escape doesn't skip past two layers at once).
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !confirmMode) onClose();
      if (e.key === 'Enter' && !confirmMode && canSave) {
        const target = e.target as HTMLElement;
        // Don't hijack Enter while a weekday chip or the schedule dropdown
        // has focus — only the name field should submit-on-Enter.
        if (target.tagName === 'INPUT' && target.getAttribute('type') === 'text') {
          handleSave();
        }
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmMode, canSave, name, type, config]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-card shadow-card p-5 w-96 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-[16px] text-text mb-4">
          {isEdit ? 'Edit Habit' : 'New Habit'}
        </h2>

        <label className="block mb-4">
          <span className="block text-[11px] text-textMuted font-ui mb-1">Name</span>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Run"
            className="w-full bg-surfaceRaised border border-border rounded-cell px-3 py-2
              text-[13px] font-ui text-text focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
          />
        </label>

        <div className="mb-5">
          <ScheduleTypePicker
            type={type}
            config={config}
            onChange={(t, c) => {
              setType(t);
              setConfig(c);
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleArchive}
                className="text-[12px] font-ui text-textMuted hover:text-text mr-3 transition-colors"
              >
                Archive
              </button>
            )}
            {isEdit && (
              <button
                type="button"
                onClick={() => setConfirmMode('delete')}
                className="text-[12px] font-ui text-danger/80 hover:text-danger transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-cell text-[13px] font-ui text-textMuted hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-cell text-[13px] font-ui font-medium bg-accent text-bg
                hover:bg-accent/90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {confirmMode === 'delete' && (
        <ConfirmDialog
          title={`Delete "${habit?.name}"?`}
          message="Archiving keeps your history and hides it from view. Deleting permanently removes the habit and all of its completion records — this can't be undone."
          options={[
            { label: 'Archive Instead', onClick: () => { setConfirmMode(null); handleArchive(); } },
            { label: 'Delete Permanently', onClick: handleDeleteConfirmed, variant: 'danger' },
          ]}
          onCancel={() => setConfirmMode(null)}
        />
      )}
    </div>
  );
}
