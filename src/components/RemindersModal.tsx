import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useAppStore } from '../store/appStore';
import type { ReminderRule } from '../domain/types';
import { ensureNotificationPermission } from '../reminders/reminderService';

interface RemindersModalProps {
  onClose: () => void;
}

const INTERVAL_OPTIONS = [30, 60, 90, 120, 180, 240];

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function describeRule(rule: ReminderRule): string {
  if (rule.kind === 'fixed') return formatTime(rule.time);
  const hours = rule.intervalMinutes / 60;
  const cadence = Number.isInteger(hours) ? `${hours}h` : `${rule.intervalMinutes}m`;
  return `Every ${cadence}, ${formatTime(rule.startTime)} – ${formatTime(rule.endTime)}`;
}

/**
 * Configure when the app should nudge the user with an OS notification to
 * check today's habits. Fires only while the app process is running (open
 * or minimized) — see src/reminders/CLAUDE.md.
 */
export function RemindersModal({ onClose }: RemindersModalProps) {
  const reminders = useAppStore((s) => s.data.settings.reminders);
  const updateReminders = useAppStore((s) => s.updateReminders);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [fixedTime, setFixedTime] = useState('08:00');
  const [intervalStart, setIntervalStart] = useState('09:00');
  const [intervalEnd, setIntervalEnd] = useState('21:00');
  const [intervalMinutes, setIntervalMinutes] = useState(120);

  useEffect(() => {
    ensureNotificationPermission().then(setPermissionGranted);
  }, []);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [onClose]);

  function addFixed() {
    updateReminders([...reminders, { id: uuid(), kind: 'fixed', time: fixedTime }]);
  }

  function addInterval() {
    updateReminders([
      ...reminders,
      { id: uuid(), kind: 'interval', startTime: intervalStart, endTime: intervalEnd, intervalMinutes },
    ]);
  }

  function removeRule(id: string) {
    updateReminders(reminders.filter((r) => r.id !== id));
  }

  const inputClass =
    'bg-surfaceRaised border border-border rounded-cell px-2 py-1.5 text-[13px] font-data tabular-nums text-text focus:outline-none focus:border-accent/60';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-card shadow-card p-5 w-[440px] max-h-[80vh] flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[16px] text-text">Reminders</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-6 h-6 flex items-center justify-center rounded-cell text-textMuted hover:text-text transition-colors"
          >
            ✕
          </button>
        </div>

        {permissionGranted === false && (
          <div className="flex items-center justify-between gap-2 mb-4 px-3 py-2 rounded-cell bg-danger/10 border border-danger/30">
            <p className="font-ui text-[12px] text-danger">Notification permission not granted.</p>
            <button
              type="button"
              onClick={() => ensureNotificationPermission().then(setPermissionGranted)}
              className="px-2 py-1 rounded-cell text-[12px] font-ui text-danger hover:bg-danger/10 transition-colors shrink-0"
            >
              Grant permission
            </button>
          </div>
        )}

        <div className="overflow-y-auto -mx-2 px-2 flex-1 min-h-0">
          {reminders.length === 0 ? (
            <p className="font-ui text-[13px] text-textMuted py-4 text-center">
              No reminders set. Add one below.
            </p>
          ) : (
            <ul className="space-y-1 mb-4">
              {reminders.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-cell hover:bg-surfaceRaised/60 transition-colors group"
                >
                  <p className="font-data tabular-nums text-[13px] text-text">{describeRule(rule)}</p>
                  <button
                    type="button"
                    onClick={() => removeRule(rule.id)}
                    aria-label="Remove reminder"
                    className="w-6 h-6 flex items-center justify-center rounded-cell text-textMuted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border pt-3 mt-1 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={fixedTime}
              onChange={(e) => setFixedTime(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={addFixed}
              className="px-2.5 py-1.5 rounded-cell text-[12px] font-ui text-accent hover:bg-accent/10 transition-colors"
            >
              Add fixed time
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="time"
              value={intervalStart}
              onChange={(e) => setIntervalStart(e.target.value)}
              className={inputClass}
            />
            <span className="font-ui text-[12px] text-textMuted">to</span>
            <input
              type="time"
              value={intervalEnd}
              onChange={(e) => setIntervalEnd(e.target.value)}
              className={inputClass}
            />
            <span className="font-ui text-[12px] text-textMuted">every</span>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className={inputClass}
            >
              {INTERVAL_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addInterval}
              className="px-2.5 py-1.5 rounded-cell text-[12px] font-ui text-accent hover:bg-accent/10 transition-colors"
            >
              Add interval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
