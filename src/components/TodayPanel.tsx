import { useState } from 'react';
import type { AppData, Habit } from '../domain/types';
import { isCompleted } from '../domain/completionCalculator';
import { isHabitScheduledOn } from '../domain/scheduling/resolver';
import { useAppStore } from '../store/appStore';
import { HabitModal } from './HabitModal';
import { ContextMenu, type ContextMenuEntry } from './ContextMenu';

interface TodayPanelProps {
  data: AppData;
  today: string;
}

/**
 * Convenience view onto the same underlying state as the grid — exists
 * purely so the user doesn't have to hunt for today's column. No separate
 * source of truth: this reads the exact same completions array the grid
 * does, and toggling here calls the exact same store action, so a toggle
 * here and a toggle in the grid are literally the same write. Today is
 * always within the current (editable) month by definition, so no
 * editable-gating is needed here the way the grid needs it.
 */
export function TodayPanel({ data, today }: TodayPanelProps) {
  const toggleCompletion = useAppStore((s) => s.toggleCompletion);
  const archiveHabit = useAppStore((s) => s.archiveHabit);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; habit: Habit } | null>(null);

  const todaysHabits = [...data.habits]
    .filter((h) => h.archivedAt === null && isHabitScheduledOn(h, today))
    .sort((a, b) => a.order - b.order);

  function menuItemsFor(habit: Habit): ContextMenuEntry[] {
    const done = isCompleted(data.completions, habit.id, today);
    return [
      { label: done ? 'Mark Not Done' : 'Mark Done', onClick: () => toggleCompletion(habit.id, today) },
      { label: 'Edit Habit', onClick: () => setEditHabit(habit) },
      { type: 'separator' },
      { label: 'Archive Habit', onClick: () => archiveHabit(habit.id) },
    ];
  }

  return (
    <div className="bg-surface rounded-card shadow-card border border-border p-4 w-64 shrink-0">
      <h2 className="font-display text-[13px] tracking-wide text-textMuted uppercase mb-3">
        Today
      </h2>
      {todaysHabits.length === 0 ? (
        <p className="font-ui text-[13px] text-textMuted">Nothing scheduled today.</p>
      ) : (
        <ul className="space-y-2">
          {todaysHabits.map((habit) => {
            const done = isCompleted(data.completions, habit.id, today);
            return (
              <li
                key={habit.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, habit });
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleCompletion(habit.id, today)}
                  className="w-full flex items-start gap-2.5 text-left group"
                >
                  <div
                    key={String(done)}
                    className={`w-4 h-4 shrink-0 mt-0.5 rounded-[3px] flex items-center justify-center transition-colors animate-check-pop
                      ${done ? 'bg-accent shadow-inset' : 'border border-border group-hover:border-accent/60'}`}
                    role="checkbox"
                    aria-checked={done}
                  >
                    {done && (
                      <svg width="9" height="8" viewBox="0 0 12 10" fill="none">
                        <path
                          d="M1.5 5.2L4.3 8L10.5 1.5"
                          stroke="#121317"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`font-ui text-[13px] whitespace-normal break-words ${
                      done ? 'text-textMuted line-through' : 'text-text'
                    }`}
                  >
                    {habit.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menuItemsFor(menu.habit)} onClose={() => setMenu(null)} />
      )}

      {editHabit && <HabitModal habit={editHabit} onClose={() => setEditHabit(null)} />}
    </div>
  );
}
