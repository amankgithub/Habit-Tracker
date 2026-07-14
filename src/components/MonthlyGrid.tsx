import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import type { AppData } from '../domain/types';
import { GridHeader } from './GridHeader';
import { HabitRow } from './HabitRow';
import { HabitModal } from './HabitModal';
import { ContextMenu, type ContextMenuEntry } from './ContextMenu';
import { useAppStore } from '../store/appStore';

interface MonthlyGridProps {
  data: AppData;
  monthAnchor: Date;
  today: string;
  editable: boolean;
}

// Habit-name column width: user-resizable (drag handle on GridHeader) and
// persisted across launches. This is view state, not habit data, so it
// lives in localStorage rather than data.json/AppData — resizing a column
// isn't something the domain layer or storage bridge should know about.
const LABEL_WIDTH_STORAGE_KEY = 'habit-tracker:labelColWidth';
const LABEL_WIDTH_MIN = 100;
const LABEL_WIDTH_MAX = 400;
const LABEL_WIDTH_DEFAULT = 160;

function readStoredLabelWidth(): number {
  const raw = localStorage.getItem(LABEL_WIDTH_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return LABEL_WIDTH_DEFAULT;
  return Math.min(LABEL_WIDTH_MAX, Math.max(LABEL_WIDTH_MIN, parsed));
}

/**
 * The main event — largest, most-visible section of the dashboard per the
 * original spec. Archived habits never appear here; that filtering happens
 * once, at this boundary, so no descendant needs to re-check archivedAt.
 * `editable` reflects whether the CURRENTLY VIEWED month is the real
 * current month — checkbox toggling is disabled entirely for past months,
 * but adding/editing/reordering habits (entity-level actions, not tied to
 * a specific day) stays available regardless of which month you're viewing.
 */
export function MonthlyGrid({ data, monthAnchor, today, editable }: MonthlyGridProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [bgMenu, setBgMenu] = useState<{ x: number; y: number } | null>(null);
  const [labelWidth, setLabelWidth] = useState<number>(readStoredLabelWidth);
  const reorderHabits = useAppStore((s) => s.reorderHabits);

  // Drag-to-resize the habit-name column, mirroring the spreadsheet-style
  // column resize convention. Width is tracked locally during the drag
  // (not read back from state each move, which would lag a frame behind
  // the pointer) and only written to localStorage once, on mouseup.
  function handleLabelResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = labelWidth;
    let current = startWidth;
    function handleMouseMove(moveEvent: MouseEvent) {
      current = Math.min(LABEL_WIDTH_MAX, Math.max(LABEL_WIDTH_MIN, startWidth + (moveEvent.clientX - startX)));
      setLabelWidth(current);
    }
    function handleMouseUp() {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      localStorage.setItem(LABEL_WIDTH_STORAGE_KEY, String(current));
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  const bgMenuItems: ContextMenuEntry[] = [{ label: 'Add Habit', onClick: () => setShowAddModal(true) }];

  const activeHabits = [...data.habits]
    .filter((h) => h.archivedAt === null)
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeHabits.findIndex((h) => h.id === active.id);
    const newIndex = activeHabits.findIndex((h) => h.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(activeHabits, oldIndex, newIndex);
    reorderHabits(reordered.map((h) => h.id));
  }

  // Keyboard-friendly per the original design goal: press "a" anywhere to
  // add a habit, as long as you're not mid-typing in some other field and
  // no modal is already open (avoids stacking modals or hijacking "a" as
  // a character while naming a habit).
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (showAddModal) return;
      const target = e.target as HTMLElement;
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;
      if (e.key === 'a' && !isTyping) {
        e.preventDefault();
        setShowAddModal(true);
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [showAddModal]);

  return (
    <div
      className="bg-surface rounded-card shadow-card border border-border overflow-hidden"
      onContextMenu={(e) => {
        e.preventDefault();
        setBgMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <GridHeader
            monthAnchor={monthAnchor}
            today={today}
            labelWidth={labelWidth}
            onLabelResizeStart={handleLabelResizeStart}
          />
          {activeHabits.length === 0 ? (
            <EmptyGridState onClick={() => setShowAddModal(true)} />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activeHabits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
                {activeHabits.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    monthAnchor={monthAnchor}
                    completions={data.completions}
                    today={today}
                    editable={editable}
                    labelWidth={labelWidth}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
          <AddHabitRow onClick={() => setShowAddModal(true)} labelWidth={labelWidth} />
        </div>
      </div>

      {showAddModal && <HabitModal onClose={() => setShowAddModal(false)} />}
      {bgMenu && <ContextMenu x={bgMenu.x} y={bgMenu.y} items={bgMenuItems} onClose={() => setBgMenu(null)} />}
    </div>
  );
}

function EmptyGridState({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-10 px-4 text-center hover:bg-surfaceRaised/40 transition-colors group"
    >
      <p className="font-display text-[15px] text-text mb-1 group-hover:text-accent transition-colors">
        No habits yet
      </p>
      <p className="font-ui text-[13px] text-textMuted">
        Click here (or press <span className="font-data text-textMuted/90">A</span>) to add your first habit.
      </p>
    </button>
  );
}

function AddHabitRow({ onClick, labelWidth }: { onClick: () => void; labelWidth: number }) {
  return (
    <div className="flex items-center border-t border-border/60">
      <button
        type="button"
        onClick={onClick}
        style={{ width: labelWidth }}
        className="shrink-0 pl-4 pr-3 py-2.5 flex items-center gap-2 text-textMuted
          hover:text-accent transition-colors font-ui text-[13px]"
      >
        <span className="w-4 h-4 flex items-center justify-center leading-none text-base transition-transform group-hover:rotate-90">
          +
        </span>
        Add habit
        <span className="ml-auto text-[10px] text-textMuted/50 font-data pr-1">A</span>
      </button>
    </div>
  );
}
