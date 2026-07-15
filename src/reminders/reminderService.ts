import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';
import type { ReminderRule } from '../domain/types';
import { getTodaysReminderTimes } from '../domain/reminders';
import { todayISO } from '../domain/dateUtils';

const POLL_INTERVAL_MS = 20_000;

/** Checks (and requests if needed) OS notification permission. */
export async function ensureNotificationPermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === 'granted';
  }
  return granted;
}

/**
 * Starts a poll loop that fires an OS notification once per configured
 * reminder time-slot per day. Only fires while this process is running
 * (foreground or minimized) — there is no closed-app/background delivery.
 * Returns a cleanup function to stop the loop.
 */
export function startReminderLoop(getReminders: () => ReminderRule[]): () => void {
  // Keyed "<today's ISO date>_<HH:mm>" so a slot fires at most once per day,
  // and naturally "resets" the next day without needing an explicit clear.
  // Intentionally in-memory only: losing this set on relaunch risks a rare
  // double-fire right at restart, never a missed reminder or corruption.
  const firedSlots = new Set<string>();

  const tick = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;
    const slotKey = `${todayISO()}_${currentTime}`;

    if (firedSlots.has(slotKey)) return;

    const todaysTimes = getTodaysReminderTimes(getReminders());
    if (todaysTimes.includes(currentTime)) {
      firedSlots.add(slotKey);
      // Fired via the custom `send_reminder_notification` Rust command
      // (src-tauri/src/lib.rs), not the notification plugin's
      // sendNotification — the plugin's desktop path caps the toast to a
      // short, auto-dismissing single line with no way to change
      // urgency/sound. The custom command hand-builds WinRT toast XML
      // (Windows) with a system dismiss action, which is what actually
      // keeps it pinned on screen until manually dismissed — scenario=
      // "reminder" alone was empirically confirmed insufficient (heading
      // still reads "Windows PowerShell" — a custom app_id needs the app to
      // be an installed/registered AUMID, which breaks delivery entirely
      // under `tauri dev`; see src-tauri/CLAUDE.md).
      invoke('send_reminder_notification', {
        title: 'Habit Tracker',
        body: "You have habits scheduled right now — open Habit Tracker to check them off before you forget.",
      }).catch((e) => console.error('[reminders] send_reminder_notification failed', e));
    }
  };

  const timer = setInterval(tick, POLL_INTERVAL_MS);
  return () => clearInterval(timer);
}
