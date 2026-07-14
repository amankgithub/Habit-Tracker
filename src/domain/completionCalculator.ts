import type { CompletionRecord, CompletionStatus, Habit, ISODate } from './types';
import { allDatesInMonth } from './dateUtils';
import { getActiveRule, getStrategyFor, isHabitScheduledOn, isQuotaBased } from './scheduling/resolver';

/** Fast lookup: is there a completion record for this habit on this date? */
export function isCompleted(
  completions: CompletionRecord[],
  habitId: string,
  date: ISODate
): boolean {
  return completions.some((c) => c.habitId === habitId && c.date === date);
}

/**
 * The three states the UI actually renders. 'not_scheduled' => no checkbox
 * at all. 'missed' => empty checkbox (covers "not completed yet" for today
 * and future dates too — visually indistinguishable, which matches spec).
 */
export function getDayStatus(
  habit: Habit,
  date: ISODate,
  completions: CompletionRecord[]
): CompletionStatus {
  if (!isHabitScheduledOn(habit, date)) return 'not_scheduled';
  return isCompleted(completions, habit.id, date) ? 'completed' : 'missed';
}

export interface GridCell {
  date: ISODate;
  status: CompletionStatus;
}

/** Every cell for one habit across one month — feeds a single grid row. */
export function getHabitMonthGrid(
  habit: Habit,
  monthAnchor: Date,
  completions: CompletionRecord[]
): GridCell[] {
  return allDatesInMonth(monthAnchor).map((date) => ({
    date,
    status: getDayStatus(habit, date, completions),
  }));
}

export interface ProgressFraction {
  completed: number;
  total: number;
}

/**
 * The "25/30" shown in the Progress column. Denominator logic:
 *  - Day-matching schedules (daily/everyXDays/specificWeekdays): count of
 *    days in the month the habit was actually scheduled (naturally
 *    shrinks for mid-month creation/archival — no special-casing needed).
 *  - Quota schedules (timesPerWeek/timesPerMonth): the quota itself
 *    (times weeks-touching-month, for timesPerWeek), NOT capped, and not
 *    reduced for mid-month creation — an unreachable quota after late
 *    creation is shown as-is rather than silently adjusted.
 * Numerator is always a plain count of completion records in the month,
 * uncapped — quota habits can legitimately show e.g. 6/4.
 */
export function getMonthlyProgress(
  habit: Habit,
  monthAnchor: Date,
  completions: CompletionRecord[]
): ProgressFraction {
  const monthDates = allDatesInMonth(monthAnchor);

  const completed = monthDates.filter((d) => isCompleted(completions, habit.id, d)).length;

  // Determine denominator. Find the rule anchoring this month: prefer the
  // rule active at the later of (month start, habit createdAt), since that
  // is the rule actually governing the visible portion of this month.
  const anchorDate =
    monthDates.find((d) => !isDateBeforeHabitCreated(habit, d)) ?? monthDates[0];
  const rule = getActiveRule(habit, anchorDate);

  if (!rule) {
    return { completed, total: 0 };
  }

  const strategy = getStrategyFor(rule.type);

  if (isQuotaBased(rule.type)) {
    // Restrict week-bucket counting to dates the habit was actually alive
    // for, so weeks entirely before creation don't inflate the quota.
    const livingDates = monthDates.filter((d) => !isDateBeforeHabitCreated(habit, d));
    return { completed, total: strategy.getMonthlyDenominator(rule.config, livingDates) };
  }

  // Day-matching schedules: total is simply how many days this month were
  // actually scheduled, which already accounts for lifecycle bounds because
  // isHabitScheduledOn (used inside the strategy filter path below) checks them.
  const total = monthDates.filter((d) => isHabitScheduledOn(habit, d)).length;
  return { completed, total };
}

function isDateBeforeHabitCreated(habit: Habit, date: ISODate): boolean {
  return date < habit.createdAt;
}

/**
 * Daily completion percentage across ALL habits, for the completion graph.
 * completed scheduled habits / scheduled habits, ignoring not-scheduled
 * habits entirely. Returns null if nothing was scheduled that day (so the
 * graph can render a gap rather than a misleading 0%).
 */
export function getDailyCompletionPercentage(
  habits: Habit[],
  date: ISODate,
  completions: CompletionRecord[]
): number | null {
  const scheduledHabits = habits.filter((h) => isHabitScheduledOn(h, date));
  if (scheduledHabits.length === 0) return null;

  const completedCount = scheduledHabits.filter((h) =>
    isCompleted(completions, h.id, date)
  ).length;

  return (completedCount / scheduledHabits.length) * 100;
}

export interface GraphPoint {
  date: ISODate;
  percentage: number | null;
}

/** Full month's worth of points for the completion graph's line series. */
export function getMonthlyCompletionGraph(
  habits: Habit[],
  monthAnchor: Date,
  completions: CompletionRecord[]
): GraphPoint[] {
  return allDatesInMonth(monthAnchor).map((date) => ({
    date,
    percentage: getDailyCompletionPercentage(habits, date, completions),
  }));
}
