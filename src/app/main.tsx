import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { Dashboard } from '../components/Dashboard';
import { useAppStore } from '../store/appStore';
import { ensureNotificationPermission, startReminderLoop } from '../reminders/reminderService';

/**
 * Milestone 4+5+6: real app entry point. Loads from the actual Tauri
 * storage layer on mount (no more fixture data), shows a brief loading
 * state, and surfaces a one-time notice if we had to fall back to empty
 * data (corrupted file, unreadable, etc.) rather than silently discarding
 * the user's data without them knowing.
 */
function App() {
  const hasLoaded = useAppStore((s) => s.hasLoaded);
  const loadNotice = useAppStore((s) => s.loadNotice);
  const init = useAppStore((s) => s.init);
  const refreshToday = useAppStore((s) => s.refreshToday);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    // Keep "today" correct if the app is left open across midnight —
    // re-check whenever the window regains focus rather than polling.
    function onFocus() {
      refreshToday();
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshToday]);

  useEffect(() => {
    ensureNotificationPermission();
    const stopReminderLoop = startReminderLoop(() => useAppStore.getState().data.settings.reminders);
    return stopReminderLoop;
  }, []);

  if (!hasLoaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="font-ui text-[13px] text-textMuted">Loading…</p>
      </div>
    );
  }

  return (
    <>
      {loadNotice && (
        <div className="bg-accent/10 border-b border-accent/30 px-4 py-2 text-center">
          <span className="font-ui text-[12px] text-accent">{loadNotice}</span>
        </div>
      )}
      <Dashboard />
    </>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
