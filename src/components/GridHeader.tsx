import { allDatesInMonth, dayOfMonth } from '../domain/dateUtils';

interface GridHeaderProps {
  monthAnchor: Date;
  today: string;
  labelWidth: number;
  onLabelResizeStart: (e: React.MouseEvent) => void;
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function GridHeader({ monthAnchor, today, labelWidth, onLabelResizeStart }: GridHeaderProps) {
  const dates = allDatesInMonth(monthAnchor);

  return (
    <div className="flex sticky top-0 bg-surface z-10">
      <div className="shrink-0 relative group" style={{ width: labelWidth }}>
        <div
          onMouseDown={onLabelResizeStart}
          title="Drag to resize habit name column"
          className="absolute inset-y-0 -right-1 w-2 cursor-col-resize z-10"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-accent/60 transition-colors" />
        </div>
      </div>
      {dates.map((date) => {
        const isToday = date === today;
        const d = new Date(date + 'T00:00:00');
        return (
          <div
            key={date}
            className={`w-7 shrink-0 flex flex-col items-center justify-center py-1.5 font-data text-[11px] tabular-nums
              ${isToday ? 'bg-accent/15 rounded-t-cell' : ''}`}
          >
            <span className="text-textMuted text-[9px] leading-none mb-0.5">
              {WEEKDAY_LETTERS[d.getDay()]}
            </span>
            <span className={isToday ? 'text-accent font-medium' : 'text-textMuted'}>
              {dayOfMonth(date)}
            </span>
          </div>
        );
      })}
      <div className="w-20 shrink-0" aria-hidden="true" />
    </div>
  );
}
