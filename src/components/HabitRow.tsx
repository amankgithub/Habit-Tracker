import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CompletionRecord, Habit } from '../domain/types';
import { getHabitMonthGrid, getMonthlyProgress, isCompleted } from '../domain/completionCalculator';
import { isHabitScheduledOn } from '../domain/scheduling/resolver';
import { GridCell } from './GridCell';
import { ProgressBadge } from './ProgressBadge';
import { HabitModal } from './HabitModal';
import { ConfirmDialog } from './ConfirmDialog';
import { ContextMenu, type ContextMenuEntry } from './ContextMenu';
import { useAppStore } from '../store/appStore';

interface HabitRowProps {
  habit: Habit;
  monthAnchor: Date;
  completions: CompletionRecord[];
  today: string;
  editable: boolean;
  labelWidth: number;
}

/** One row = one habit. Draggable (via @dnd-kit) for reordering, clickable
 * cells (gated by `editable`), and a hover-revealed edit affordance that
 * opens the same HabitModal used for creation. */
export function HabitRow({ habit, monthAnchor, completions, today, editable, labelWidth }: HabitRowProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const toggleCompletion = useAppStore((s) => s.toggleCompletion);
  const archiveHabit = useAppStore((s) => s.archiveHabit);
  const deleteHabitPermanently = useAppStore((s) => s.deleteHabitPermanently);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  });

  const cells = getHabitMonthGrid(habit, monthAnchor, completions);
  const progress = getMonthlyProgress(habit, monthAnchor, completions);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const scheduledToday = isHabitScheduledOn(habit, today);
  const doneToday = isCompleted(completions, habit.id, today);

  function openMenuAt(x: number, y: number) {
    setMenu({ x, y });
  }

  const menuItems: ContextMenuEntry[] = [
    { label: 'Edit Habit', onClick: () => setShowEditModal(true) },
    ...(editable && scheduledToday
      ? [
          {
            label: doneToday ? 'Mark Not Done Today' : 'Mark Done Today',
            onClick: () => toggleCompletion(habit.id, today),
          } as ContextMenuEntry,
        ]
      : []),
    { type: 'separator' },
    { label: 'Archive Habit', onClick: () => archiveHabit(habit.id) },
    { label: 'Delete Permanently', variant: 'danger', onClick: () => setConfirmDelete(true) },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openMenuAt(e.clientX, e.clientY);
      }}
      className="flex items-center border-b border-border/60 hover:bg-surfaceRaised/40 transition-colors group animate-row-in"
    >
      <div
        style={{ width: labelWidth }}
        className="shrink-0 pl-1 pr-2 py-2 flex items-center gap-1.5 min-w-0"
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="w-4 h-6 shrink-0 flex items-center justify-center text-textMuted/0
            group-hover:text-textMuted/60 hover:!text-text cursor-grab active:cursor-grabbing transition-colors"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="font-display text-[13px] text-text text-left hover:text-accent transition-colors min-w-0
            whitespace-normal break-words line-clamp-2"
          title={habit.name}
        >
          {habit.name}
        </button>
        <button
          type="button"
          onClick={(e) => openMenuAt(e.clientX, e.clientY)}
          aria-label="Habit actions"
          title="Habit actions (or right-click the row)"
          className="ml-auto w-5 h-5 shrink-0 flex items-center justify-center rounded-cell text-textMuted/0
            group-hover:text-textMuted/70 hover:!text-text hover:!bg-surfaceRaised transition-colors"
        >
          ⋮
        </button>
      </div>
      {cells.map((cell) => (
        <GridCell
          key={cell.date}
          status={cell.status}
          isToday={cell.date === today}
          editable={editable}
          date={cell.date}
          onToggle={() => toggleCompletion(habit.id, cell.date)}
        />
      ))}
      <ProgressBadge completed={progress.completed} total={progress.total} />

      {showEditModal && <HabitModal habit={habit} onClose={() => setShowEditModal(false)} />}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${habit.name}"?`}
          message="Archiving keeps your history and hides it from view. Deleting permanently removes the habit and all of its completion records — this can't be undone."
          options={[
            {
              label: 'Archive Instead',
              onClick: () => {
                setConfirmDelete(false);
                archiveHabit(habit.id);
              },
            },
            {
              label: 'Delete Permanently',
              variant: 'danger',
              onClick: () => {
                setConfirmDelete(false);
                deleteHabitPermanently(habit.id);
              },
            },
          ]}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
