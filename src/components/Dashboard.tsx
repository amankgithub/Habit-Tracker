import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { MonthNavigator } from './MonthNavigator';
import { TodayPanel } from './TodayPanel';
import { MonthlyGrid } from './MonthlyGrid';
import { CompletionGraph } from './CompletionGraph';
import { ArchivedHabitsModal } from './ArchivedHabitsModal';
import { RemindersModal } from './RemindersModal';

/**
 * The single page of the app. Layout priority matches the spec: the
 * monthly grid is the largest, most prominent element. Today Panel sits
 * alongside it (not above, to keep the grid vertically dominant on a
 * typical desktop window), graph runs full-width below. Pulls everything
 * from the store now — no more prop-drilled fixture data.
 */
export function Dashboard() {
  const data = useAppStore((s) => s.data);
  const monthAnchor = useAppStore((s) => s.viewedMonthAnchor);
  const today = useAppStore((s) => s.today);
  const editable = useAppStore((s) => s.isViewingCurrentMonth());
  const [showArchived, setShowArchived] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  const archivedCount = data.habits.filter((h) => h.archivedAt !== null).length;

  return (
    <div className="min-h-screen bg-bg px-6 py-5">
      <header className="flex items-center justify-between mb-5">
        <MonthNavigator />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReminders(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-cell border border-border
              text-textMuted hover:text-text hover:border-accent/50 transition-colors font-ui text-[12px]"
          >
            Reminders
          </button>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-cell border border-border
              text-textMuted hover:text-text hover:border-accent/50 transition-colors font-ui text-[12px]"
          >
            Archived
            {archivedCount > 0 && (
              <span className="min-w-[16px] px-1 h-4 flex items-center justify-center rounded-full bg-surfaceRaised text-[10px] font-data tabular-nums text-textMuted">
                {archivedCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {showArchived && <ArchivedHabitsModal onClose={() => setShowArchived(false)} />}
      {showReminders && <RemindersModal onClose={() => setShowReminders(false)} />}

      <div className="flex gap-5 items-start mb-5">
        <div className="flex-1 min-w-0">
          <MonthlyGrid data={data} monthAnchor={monthAnchor} today={today} editable={editable} />
        </div>
        <TodayPanel data={data} today={today} />
      </div>

      <CompletionGraph data={data} monthAnchor={monthAnchor} />
    </div>
  );
}
