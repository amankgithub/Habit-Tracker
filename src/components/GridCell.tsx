import { useState } from 'react';
import type { CompletionStatus } from '../domain/types';
import { ContextMenu, type ContextMenuEntry } from './ContextMenu';

interface GridCellProps {
  status: CompletionStatus;
  isToday: boolean;
  editable: boolean;
  date?: string;
  onToggle?: () => void;
}

/**
 * The single visual unit of the monthly grid. Three states, matching the
 * spec exactly:
 *  - completed: filled brass square with a hand-drawn-style tick
 *  - missed: outlined square, empty (scheduled but not done — this also
 *    covers "not done yet" for today/future, which is visually correct:
 *    the user can't tell the difference between "missed" and "hasn't
 *    happened yet" just by looking, and shouldn't need to)
 *  - not_scheduled: nothing rendered at all, just empty space
 *
 * `editable` gates clickability — false when viewing a frozen past month.
 * Right-click (when editable) opens a one-item context menu that mirrors
 * the left-click toggle — same underlying `onToggle`, just an explicit,
 * discoverable label instead of a blind click.
 */
export function GridCell({ status, isToday, editable, date, onToggle }: GridCellProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  if (status === 'not_scheduled') {
    return <div className="w-7 h-7 shrink-0 flex items-center justify-center" aria-hidden="true" />;
  }

  const isCompleted = status === 'completed';

  const menuItems: ContextMenuEntry[] = [
    {
      label: isCompleted ? 'Mark as Not Completed' : 'Mark as Completed',
      onClick: () => onToggle?.(),
    },
  ];

  return (
    <button
      type="button"
      disabled={!editable}
      onClick={onToggle}
      onContextMenu={(e) => {
        if (!editable) return;
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      title={date}
      className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-cell transition-colors
        ${isToday ? 'ring-1 ring-accent/60' : ''}
        ${editable ? 'cursor-pointer hover:bg-surfaceRaised active:scale-90 transition-transform' : 'cursor-default'}`}
      role="checkbox"
      aria-checked={isCompleted}
      aria-label={isCompleted ? 'completed' : 'not completed'}
    >
      <div
        key={status}
        className={`w-5 h-5 rounded-[3px] flex items-center justify-center transition-colors animate-check-pop
          ${
            isCompleted
              ? 'bg-accent shadow-inset'
              : 'border border-border bg-surface/40'
          }`}
      >
        {isCompleted && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path
              d="M1.5 5.2L4.3 8L10.5 1.5"
              stroke="#121317"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </button>
  );
}
