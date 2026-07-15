import type { AppData, ReminderRule } from './types';

/** Replaces the full reminders list. Additive/whole-array, same style as reorderHabits. */
export function updateReminders(data: AppData, reminders: ReminderRule[]): AppData {
  return { ...data, settings: { ...data.settings, reminders } };
}
