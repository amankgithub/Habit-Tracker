import { create } from 'zustand';
import { addMonths } from 'date-fns';
import type { AppData, ReminderRule, ScheduleConfig, ScheduleType } from '../domain/types';
import { createEmptyAppData } from '../domain/types';
import {
  archiveHabit as domainArchiveHabit,
  createHabit as domainCreateHabit,
  deleteHabitPermanently as domainDeleteHabit,
  renameHabit as domainRenameHabit,
  reorderHabits as domainReorderHabits,
  toggleCompletion as domainToggleCompletion,
  unarchiveHabit as domainUnarchiveHabit,
  updateHabitSchedule as domainUpdateSchedule,
} from '../domain/habitActions';
import { updateReminders as domainUpdateReminders } from '../domain/settingsActions';
import { monthKey, todayISO } from '../domain/dateUtils';
import { loadData, saveData } from '../storage/storage';

// Debounced persistence: batch rapid successive edits (e.g. typing a habit
// name) into a single disk write, rather than writing on every keystroke.
// Safe to debounce because the underlying Tauri write is atomic — losing a
// pending debounce on app-quit is the only real risk, which is acceptable
// for a 250ms window on a single-user local tool.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(data: AppData) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveData(data).catch((err) => console.error('[store] Failed to save data', err));
  }, 250);
}

interface AppState {
  data: AppData;
  hasLoaded: boolean;
  loadNotice: string | null; // e.g. "started fresh — previous file was corrupted"
  today: string;
  viewedMonthAnchor: Date;

  init: () => Promise<void>;
  refreshToday: () => void;

  toggleCompletion: (habitId: string, date: string) => void;
  addHabit: (params: { name: string; type: ScheduleType; config: ScheduleConfig }) => void;
  updateHabitSchedule: (habitId: string, type: ScheduleType, config: ScheduleConfig) => void;
  renameHabit: (habitId: string, name: string) => void;
  archiveHabit: (habitId: string) => void;
  unarchiveHabit: (habitId: string) => void;
  deleteHabitPermanently: (habitId: string) => void;
  reorderHabits: (orderedHabitIds: string[]) => void;
  updateReminders: (reminders: ReminderRule[]) => void;

  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  isViewingCurrentMonth: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  data: createEmptyAppData(),
  hasLoaded: false,
  loadNotice: null,
  today: todayISO(),
  viewedMonthAnchor: new Date(),

  init: async () => {
    const result = await loadData();
    set({
      data: result.data,
      hasLoaded: true,
      loadNotice: result.recoveredFromFallback
        ? result.fallbackReason === 'read_error'
          ? "Couldn't read your saved data — started fresh."
          : result.fallbackReason === 'corrupted' || result.fallbackReason === 'invalid_shape'
            ? 'Your saved data looked corrupted — started fresh to be safe.'
            : null
        : null,
    });
  },

  refreshToday: () => set({ today: todayISO() }),

  toggleCompletion: (habitId, date) => {
    const { data, today } = get();
    const next = domainToggleCompletion(data, habitId, date, today);
    set({ data: next });
    schedulePersist(next);
  },

  addHabit: (params) => {
    const next = domainCreateHabit(get().data, params);
    set({ data: next });
    schedulePersist(next);
  },

  updateHabitSchedule: (habitId, type, config) => {
    const next = domainUpdateSchedule(get().data, habitId, type, config);
    set({ data: next });
    schedulePersist(next);
  },

  renameHabit: (habitId, name) => {
    const next = domainRenameHabit(get().data, habitId, name);
    set({ data: next });
    schedulePersist(next);
  },

  archiveHabit: (habitId) => {
    const next = domainArchiveHabit(get().data, habitId);
    set({ data: next });
    schedulePersist(next);
  },

  unarchiveHabit: (habitId) => {
    const next = domainUnarchiveHabit(get().data, habitId);
    set({ data: next });
    schedulePersist(next);
  },

  deleteHabitPermanently: (habitId) => {
    const next = domainDeleteHabit(get().data, habitId);
    set({ data: next });
    schedulePersist(next);
  },

  reorderHabits: (orderedHabitIds) => {
    const next = domainReorderHabits(get().data, orderedHabitIds);
    set({ data: next });
    schedulePersist(next);
  },

  updateReminders: (reminders) => {
    const next = domainUpdateReminders(get().data, reminders);
    set({ data: next });
    schedulePersist(next);
  },

  goToPreviousMonth: () => set((s) => ({ viewedMonthAnchor: addMonths(s.viewedMonthAnchor, -1) })),

  goToNextMonth: () =>
    set((s) => {
      // Never navigate past the current real month — the future doesn't
      // have anything to show yet.
      const candidate = addMonths(s.viewedMonthAnchor, 1);
      if (monthKey(candidate) > monthKey(new Date())) return s;
      return { viewedMonthAnchor: candidate };
    }),

  goToCurrentMonth: () => set({ viewedMonthAnchor: new Date() }),

  isViewingCurrentMonth: () => monthKey(get().viewedMonthAnchor) === monthKey(new Date()),
}));
