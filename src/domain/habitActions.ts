import { v4 as uuid } from 'uuid';
import type {
  AppData,
  CompletionRecord,
  Habit,
  ISODate,
  ScheduleConfig,
  ScheduleType,
} from './types';
import { monthKeyFromISODate, todayISO } from './dateUtils';

/** Creates a brand new habit with its first (and only) active schedule rule. */
export function createHabit(
  data: AppData,
  params: {
    name: string;
    icon?: string;
    color?: string;
    type: ScheduleType;
    config: ScheduleConfig;
    createdAt?: ISODate;
  }
): AppData {
  const createdAt = params.createdAt ?? todayISO();
  const maxOrder = data.habits.reduce((max, h) => Math.max(max, h.order), -1);

  const habit: Habit = {
    id: uuid(),
    name: params.name,
    icon: params.icon,
    color: params.color,
    order: maxOrder + 1,
    createdAt,
    archivedAt: null,
    scheduleHistory: [
      {
        id: uuid(),
        type: params.type,
        config: params.config,
        effectiveFrom: createdAt,
        effectiveTo: null,
      },
    ],
  };

  return { ...data, habits: [...data.habits, habit] };
}

/**
 * Changes a habit's schedule starting today (or a given date). This closes
 * out the currently active rule (sets its effectiveTo) and appends a new
 * one — it never mutates an old rule's config, which is what keeps past
 * months' rendering stable after an edit.
 */
export function updateHabitSchedule(
  data: AppData,
  habitId: string,
  newType: ScheduleType,
  newConfig: ScheduleConfig,
  effectiveFrom: ISODate = todayISO()
): AppData {
  const habits = data.habits.map((habit) => {
    if (habit.id !== habitId) return habit;

    const closedHistory = habit.scheduleHistory.map((rule) =>
      rule.effectiveTo === null ? { ...rule, effectiveTo: effectiveFrom } : rule
    );

    return {
      ...habit,
      scheduleHistory: [
        ...closedHistory,
        {
          id: uuid(),
          type: newType,
          config: newConfig,
          effectiveFrom,
          effectiveTo: null,
        },
      ],
    };
  });

  return { ...data, habits };
}

export function renameHabit(data: AppData, habitId: string, name: string): AppData {
  return {
    ...data,
    habits: data.habits.map((h) => (h.id === habitId ? { ...h, name } : h)),
  };
}

/** Soft delete — keeps history intact, hides from active views. */
export function archiveHabit(data: AppData, habitId: string, archivedAt: ISODate = todayISO()): AppData {
  return {
    ...data,
    habits: data.habits.map((h) => (h.id === habitId ? { ...h, archivedAt } : h)),
  };
}

/** Reverses archiveHabit — habit reappears in active views with history intact. */
export function unarchiveHabit(data: AppData, habitId: string): AppData {
  return {
    ...data,
    habits: data.habits.map((h) => (h.id === habitId ? { ...h, archivedAt: null } : h)),
  };
}

/** Hard delete — removes the habit AND all of its completion records. */
export function deleteHabitPermanently(data: AppData, habitId: string): AppData {
  return {
    ...data,
    habits: data.habits.filter((h) => h.id !== habitId),
    completions: data.completions.filter((c) => c.habitId !== habitId),
  };
}

/** Explicit manual reordering — drag-and-drop writes an array of habit IDs in new order. */
export function reorderHabits(data: AppData, orderedHabitIds: string[]): AppData {
  const orderIndex = new Map(orderedHabitIds.map((id, idx) => [id, idx]));
  return {
    ...data,
    habits: data.habits.map((h) => ({
      ...h,
      order: orderIndex.get(h.id) ?? h.order,
    })),
  };
}

/**
 * Toggles a single day's completion for a habit. Only the CURRENT month is
 * editable — past months are frozen the instant the calendar rolls over,
 * regardless of which specific day within that past month is targeted.
 * Callers (UI) should gate on this too, but the domain layer enforces it
 * as the actual source of truth so it can never be bypassed.
 */
export function toggleCompletion(
  data: AppData,
  habitId: string,
  date: ISODate,
  referenceToday: ISODate = todayISO()
): AppData {
  if (!isMonthEditable(date, referenceToday)) {
    // Past months are frozen — return data unchanged.
    return data;
  }

  const exists = data.completions.some((c) => c.habitId === habitId && c.date === date);

  const completions: CompletionRecord[] = exists
    ? data.completions.filter((c) => !(c.habitId === habitId && c.date === date))
    : [...data.completions, { habitId, date }];

  return { ...data, completions };
}

/**
 * A month is editable only while it is the CURRENT calendar month. The
 * instant the month rolls over (12:00 AM on the 1st), the entire previous
 * month freezes as a permanent snapshot — no per-day distinction within it.
 */
export function isMonthEditable(date: ISODate, referenceToday: ISODate = todayISO()): boolean {
  return monthKeyFromISODate(date) === monthKeyFromISODate(referenceToday);
}
