# Habit Tracker — Milestone 2: Storage Layer + Tauri Scaffold

## What this milestone adds

- **`src-tauri/`** — the Tauri v2 Rust backend shell. Two real commands:
  - `load_data` — reads `data.json` from the OS app-data directory. Returns `null` (not an error) if the file doesn't exist yet.
  - `save_data` — writes atomically: writes to a `.tmp` file first, then renames it over the real file. A crash or power loss mid-save can never leave a half-written, corrupted `data.json`.
  - `backup_data` — creates a timestamped copy of the current file. Not wired into any UI yet, but available for a future "restore last backup" feature.
- **`src/storage/storage.ts`** — the frontend wrapper around those commands. This is where the real logic lives:
  - Missing file → empty `AppData`, no warning (normal first launch).
  - Malformed JSON → empty `AppData`, `console.warn`, `fallbackReason: 'corrupted'`.
  - Valid JSON but wrong shape → empty `AppData`, `fallbackReason: 'invalid_shape'`.
  - Rust command throws (e.g. permissions) → empty `AppData`, `fallbackReason: 'read_error'`.
  - **Never throws** — every failure mode resolves to safe empty data rather than crashing the app on launch.
- **`src/app/main.tsx`** — a deliberately bare-bones placeholder screen that proves the load → mutate → save round-trip works end to end. **This is not the real UI** — it gets fully replaced in Milestone 3.
- Minimal Vite scaffold (`vite.config.ts`, `index.html`) so Tauri has something real to point at.

## What's verified in this environment vs. what needs your machine

| Verified here | Needs your machine |
|---|---|
| All 28 unit tests pass (21 domain + 7 storage), including every fallback path | `cargo check` on the Rust backend |
| `npx tsc --noEmit` — whole project type-checks clean, including React/JSX | `cargo tauri dev` — actually launching the app window |
| `npx vite build` — frontend bundles successfully | `cargo tauri build` — producing the real installer |

**Why the Rust side isn't verified here:** this build sandbox only has Rust 1.75 available (via apt), and one of Tauri v2's transitive dependencies requires Rust's `edition2024` feature, which needs a considerably newer toolchain. I don't have network access to `rustup.rs` in this sandbox to install one. The Rust code is written against the correct Tauri v2 APIs (`tauri::Manager`, `app_handle.path().app_data_dir()`, `generate_handler!`), but please run this after unzipping to confirm:

```bash
cd src-tauri
cargo check
```

If that's clean, `npm run dev` (from the project root) should launch the actual app window.

## How to run everything

```bash
npm install
npm test              # 28 tests, all should pass
npx tsc --noEmit      # should be silent
npm run dev           # launches the Tauri app window (needs Rust toolchain 1.77+)
```

## Known gaps / not-yet-done

- `tauri.conf.json` references icon files (`icons/32x32.png` etc.) that don't exist yet — bundling a real installer will fail until real icons are added. Run `npx tauri icon <path-to-a-1024x1024-png>` once you have a logo, or I can generate simple placeholder icons next round if you want to unblock `cargo tauri build` sooner.
- `main.tsx` is a throwaway proof-of-wiring screen, not the dashboard.
