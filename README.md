# Habit Tracker

An offline-first desktop habit tracker. No account, no sync, no network calls — everything lives in a single local file on your machine.

## Installing from the release zip

1. Download the release `.zip` from the [Releases](https://github.com/amankgithub/Habit-Tracker/releases) page and extract it anywhere.
2. Inside, run the installer for your platform:
   - **Windows**: run the `.msi` or `.exe` setup file, then launch **Habit Tracker** from the Start Menu.
   - **macOS**: open the `.dmg` and drag **Habit Tracker** into Applications.
   - **Linux**: install the `.AppImage`, `.deb`, or `.rpm` included in the zip.
3. Launch the app. On first launch there's no data file yet — the app starts with an empty dashboard, which is expected (not an error).

Your data is saved automatically to a local `data.json` file in the OS app-data directory (not inside the install folder), so it persists across updates/reinstalls.

## Using the app

### Adding a habit
- Click **Add Habit** (or press `a` while focused on the grid) to open the habit form.
- Give it a name and choose a schedule type:

  | Schedule | Behavior |
  |---|---|
  | Daily | Scheduled every day |
  | Every X days | Repeats on an interval starting from a chosen date |
  | Specific weekdays | Only scheduled on the weekdays you pick |
  | X times per week | A weekly quota — every day is checkable, aim for the target count |
  | X times per month | A monthly quota — every day is checkable, aim for the target count |

### Tracking completions
- Click a cell in the grid to mark a habit complete/incomplete for that day.
- **Only the current calendar month is editable** — past months are frozen and shown read-only so your history stays accurate.
- The **Today** panel on the right gives a quick-check view of just today's habits.
- The completion graph at the bottom shows your daily/monthly completion trend.

### Editing & organizing habits
- Right-click a habit row (or use the **⋮** button that appears on hover) for rename, edit schedule, archive, or delete.
- Drag habit rows by their handle to reorder them.
- Drag the edge of the habit-name column to resize it — this is just a display preference and isn't saved in your data file.
- Editing a habit's schedule doesn't rewrite history: past months keep rendering exactly as they did before the change.

### Archiving vs. deleting
- **Archive** hides a habit from the grid/Today panel but keeps its full completion history.
- Open **Archived** (button in the header, shows a count badge) to **Restore** an archived habit or **Delete Permanently** (this is the only action that actually erases a habit and its history — it cannot be undone).

### Navigating months
- Use the month navigator at the top to move between months. Only the current month allows editing; browsing past months is always available.

## Data & backups

- Data is stored as plain JSON at `data.json` in your OS's app-data directory for this app.
- Writes are atomic (written to a temp file, then renamed into place), so a crash or power loss mid-save can't corrupt your data — worst case you lose the last unsaved edit.
- If the app can't read your data file (missing or corrupted) it starts fresh automatically and shows a one-time banner explaining what happened, rather than crashing.
- To back up manually, copy `data.json` somewhere safe; to restore, replace it while the app is closed.

## Developing / building from source

```
npm install
npm run dev     # launches the Tauri app (needs Rust toolchain 1.77+)
npm run build   # produces an installer in src-tauri/target/release/bundle/
```

See [MILESTONE_2_NOTES.md](MILESTONE_2_NOTES.md) for background on the storage layer and project history.
