/**
 * Core data model for the Habit Tracker.
 *
 * Design principles baked into these types (do not violate them casually):
 *  - Dates are always ISO "YYYY-MM-DD" strings. No Date objects in stored data,
 *    ever — Date objects are only used transiently inside pure functions.
 *  - Schedule rules are versioned (effectiveFrom/effectiveTo), never mutated
 *    in place. Editing a habit's schedule means appending a new rule, not
 *    rewriting the old one. This is what keeps past months' meaning stable
 *    even after the user changes how a habit is scheduled.
 *  - CompletionRecord stores a derived status explicitly (completed / missed /
 *    not_scheduled) rather than a bare boolean. The scheduling engine is the
 *    only thing that writes these; the UI never guesses a day's status.
 */

export type ISODate = string; // "YYYY-MM-DD"

export type CompletionStatus = 'completed' | 'missed' | 'not_scheduled';

export type ScheduleType =
  | 'daily'
  | 'everyXDays'
  | 'timesPerWeek'
  | 'timesPerMonth'
  | 'specificWeekdays';

export interface DailyConfig {
  // no parameters
}

export interface EveryXDaysConfig {
  interval: number; // e.g. 3 = every 3rd day
  startDate: ISODate; // user-inputtable anchor, independent of habit.createdAt
}

export interface TimesPerWeekConfig {
  count: number; // quota per week, can be exceeded
}

export interface TimesPerMonthConfig {
  count: number; // quota per month, can be exceeded
}

export interface SpecificWeekdaysConfig {
  weekdays: number[]; // 0 = Sunday ... 6 = Saturday
}

export type ScheduleConfig =
  | DailyConfig
  | EveryXDaysConfig
  | TimesPerWeekConfig
  | TimesPerMonthConfig
  | SpecificWeekdaysConfig;

/**
 * A single version of a habit's schedule. effectiveTo is exclusive; null
 * means "still active". Never mutate an existing rule's config in place —
 * close it out (set effectiveTo) and append a new rule instead.
 */
export interface ScheduleRule {
  id: string;
  type: ScheduleType;
  config: ScheduleConfig;
  effectiveFrom: ISODate; // inclusive
  effectiveTo: ISODate | null; // exclusive, null = open-ended
}

export interface Habit {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number; // explicit manual ordering, do not infer from array position
  createdAt: ISODate;
  archivedAt: ISODate | null;
  scheduleHistory: ScheduleRule[];
}

/**
 * Only COMPLETED days are ever persisted. A record's presence means
 * "the user checked this box." Absence of a record means either 'missed'
 * or 'not_scheduled' — which one is derived at query time from the
 * scheduling engine, never stored. This keeps storage tiny (no need to
 * write a record for every unchecked day) and keeps past-month figures
 * correct forever, since the derivation is pure and deterministic.
 */
export interface CompletionRecord {
  habitId: string;
  date: ISODate;
}

/**
 * A reminder fires an OS notification while the app is running (foreground
 * or minimized) prompting the user to check today's habits. There is no
 * background/closed-app delivery — see src/notifications/CLAUDE.md.
 */
export type ReminderRule =
  | { id: string; kind: 'fixed'; time: string } // "HH:mm", 24h
  | { id: string; kind: 'interval'; startTime: string; endTime: string; intervalMinutes: number };

export interface AppSettings {
  weekStartsOn: 1; // Monday, fixed constant per product decision
  theme: 'dark';
  reminders: ReminderRule[];
}

export interface AppData {
  habits: Habit[];
  completions: CompletionRecord[];
  settings: AppSettings;
}

export function createEmptyAppData(): AppData {
  return {
    habits: [],
    completions: [],
    settings: {
      weekStartsOn: 1,
      theme: 'dark',
      reminders: [],
    },
  };
}
