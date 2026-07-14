import type { ISODate, ScheduleConfig } from '../types';

/**
 * Every schedule type implements this. Pure functions only — no storage,
 * no UI, no side effects. This is what makes the engine unit-testable in
 * isolation and safe to reuse for the grid, the today panel, the progress
 * column, and the completion graph without ever duplicating logic.
 */
export interface ScheduleStrategy<TConfig extends ScheduleConfig = ScheduleConfig> {
  /**
   * Does this day get a checkbox at all? For quota-based schedules
   * (timesPerWeek / timesPerMonth) this is always true within the active
   * range — the user is accountable to himself, not locked out of any day.
   */
  isScheduled(config: TConfig, date: ISODate): boolean;

  /**
   * The denominator shown in the Progress column for the given month,
   * e.g. the "30" in "25/30". For day-matching schedules this is a count
   * of matching days; for quota schedules it's the quota itself (or quota
   * x number of weeks touching the month, for timesPerWeek).
   */
  getMonthlyDenominator(config: TConfig, monthDates: ISODate[]): number;
}
