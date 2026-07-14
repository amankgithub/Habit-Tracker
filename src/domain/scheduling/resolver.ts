import type { Habit, ISODate, ScheduleRule, ScheduleType } from '../types';
import type { ScheduleStrategy } from './types';
import {
  dailyStrategy,
  everyXDaysStrategy,
  specificWeekdaysStrategy,
  timesPerMonthStrategy,
  timesPerWeekStrategy,
} from './strategies';
import { isDateBefore, isDateOnOrAfter } from '../dateUtils';

const STRATEGIES: Record<ScheduleType, ScheduleStrategy<any>> = {
  daily: dailyStrategy,
  everyXDays: everyXDaysStrategy,
  timesPerWeek: timesPerWeekStrategy,
  timesPerMonth: timesPerMonthStrategy,
  specificWeekdays: specificWeekdaysStrategy,
};

export function isQuotaBased(type: ScheduleType): boolean {
  return type === 'timesPerWeek' || type === 'timesPerMonth';
}

/**
 * Finds the schedule rule active on a given date, or null if none.
 * effectiveFrom is inclusive, effectiveTo is exclusive.
 */
export function getActiveRule(habit: Habit, date: ISODate): ScheduleRule | null {
  return (
    habit.scheduleHistory.find((rule) => {
      const afterStart = isDateOnOrAfter(date, rule.effectiveFrom);
      const beforeEnd = rule.effectiveTo === null || isDateBefore(date, rule.effectiveTo);
      return afterStart && beforeEnd;
    }) ?? null
  );
}

/**
 * Is this habit "alive" on the given date — i.e. created by then and not
 * yet archived? Days outside this range are never scheduled, regardless
 * of what any schedule rule says. This is what makes mid-month creation
 * and archival "just work" without special-casing anywhere else.
 */
export function isHabitAliveOn(habit: Habit, date: ISODate): boolean {
  if (isDateBefore(date, habit.createdAt)) return false;
  if (habit.archivedAt !== null && isDateOnOrAfter(date, habit.archivedAt)) return false;
  return true;
}

/**
 * The single source of truth for "does this day get a checkbox for this
 * habit?" Combines habit lifecycle bounds with the active schedule rule's
 * strategy. Used by the grid, the today panel, and the completion graph —
 * never re-derive this logic elsewhere.
 */
export function isHabitScheduledOn(habit: Habit, date: ISODate): boolean {
  if (!isHabitAliveOn(habit, date)) return false;
  const rule = getActiveRule(habit, date);
  if (!rule) return false;
  const strategy = STRATEGIES[rule.type];
  return strategy.isScheduled(rule.config, date);
}

export function getStrategyFor(type: ScheduleType): ScheduleStrategy<any> {
  return STRATEGIES[type];
}
