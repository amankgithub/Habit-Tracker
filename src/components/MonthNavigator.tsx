import { format } from 'date-fns';
import { useAppStore } from '../store/appStore';

/** Real navigation, wired to the store. Forward navigation stops at the
 * current real month — there's nothing to show beyond it yet. */
export function MonthNavigator() {
  const monthAnchor = useAppStore((s) => s.viewedMonthAnchor);
  const goToPreviousMonth = useAppStore((s) => s.goToPreviousMonth);
  const goToNextMonth = useAppStore((s) => s.goToNextMonth);
  const goToCurrentMonth = useAppStore((s) => s.goToCurrentMonth);
  const isCurrentMonth = useAppStore((s) => s.isViewingCurrentMonth());

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={goToPreviousMonth}
        aria-label="Previous month"
        className="w-7 h-7 flex items-center justify-center rounded-cell border border-border
          text-textMuted hover:text-text hover:border-accent/50 transition-colors"
      >
        ‹
      </button>
      <div className="min-w-[160px] text-center">
        <h1 className="font-display text-[17px] font-medium text-text tracking-wide">
          {format(monthAnchor, 'MMMM yyyy')}
        </h1>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={goToCurrentMonth}
            className="font-ui text-[10px] text-accent/80 hover:text-accent uppercase tracking-wide transition-colors"
          >
            Read-only — past month · Jump to today
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={goToNextMonth}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className="w-7 h-7 flex items-center justify-center rounded-cell border border-border
          text-textMuted hover:text-text hover:border-accent/50 transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-textMuted disabled:hover:border-border"
      >
        ›
      </button>
    </div>
  );
}
