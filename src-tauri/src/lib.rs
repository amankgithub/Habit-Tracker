// Habit Tracker — Rust backend.
//
// Deliberately thin by design (per project decision: keep it simple, no
// business logic lives here). Its only job is reading and writing a single
// JSON file in the OS app-data directory. All scheduling/completion logic
// lives in the TypeScript domain layer (src/domain) and is fully tested
// independently of this file.

use std::fs;
use std::io::Write;
use tauri::Manager;

const DATA_FILE_NAME: &str = "data.json";

/// Returns the app's data directory, creating it if it doesn't exist yet.
fn ensure_app_data_dir(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data directory: {e}"))?;

    fs::create_dir_all(&dir).map_err(|e| format!("Could not create app data directory: {e}"))?;

    Ok(dir)
}

/// Reads the raw JSON file contents as a string. Returns `Ok(None)` if the
/// file doesn't exist yet (first launch) — the frontend interprets that as
/// "start with empty data," not an error. Actual read/IO failures are
/// surfaced as `Err` so the frontend can fall back safely without silently
/// hiding a real problem (e.g. permissions issues).
#[tauri::command]
fn load_data(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = ensure_app_data_dir(&app_handle)?;
    let file_path = dir.join(DATA_FILE_NAME);

    if !file_path.exists() {
        return Ok(None);
    }

    fs::read_to_string(&file_path)
        .map(Some)
        .map_err(|e| format!("Failed to read data file: {e}"))
}

/// Writes the given JSON string to disk atomically: write to a temp file
/// first, then rename over the real file. This means a crash or power loss
/// mid-write can never leave a half-written, corrupted data.json — the
/// rename is effectively instantaneous at the filesystem level.
#[tauri::command]
fn save_data(app_handle: tauri::AppHandle, json: String) -> Result<(), String> {
    let dir = ensure_app_data_dir(&app_handle)?;
    let file_path = dir.join(DATA_FILE_NAME);
    let temp_path = dir.join(format!("{DATA_FILE_NAME}.tmp"));

    {
        let mut temp_file = fs::File::create(&temp_path)
            .map_err(|e| format!("Failed to create temp file: {e}"))?;
        temp_file
            .write_all(json.as_bytes())
            .map_err(|e| format!("Failed to write temp file: {e}"))?;
        temp_file
            .sync_all()
            .map_err(|e| format!("Failed to flush temp file: {e}"))?;
    }

    fs::rename(&temp_path, &file_path)
        .map_err(|e| format!("Failed to finalize data file: {e}"))?;

    Ok(())
}

/// Creates a timestamped backup copy of the current data file before a risky
/// operation (kept for future use — not yet called by the frontend, but
/// available as a safety net if we add "restore last backup" later).
#[tauri::command]
fn backup_data(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let dir = ensure_app_data_dir(&app_handle)?;
    let file_path = dir.join(DATA_FILE_NAME);

    if !file_path.exists() {
        return Ok(None);
    }

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let backup_path = dir.join(format!("data.backup.{timestamp}.json"));

    fs::copy(&file_path, &backup_path).map_err(|e| format!("Failed to create backup: {e}"))?;

    Ok(Some(backup_path.to_string_lossy().to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_data, save_data, backup_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
