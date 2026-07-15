// Habit Tracker — Rust backend.
//
// Deliberately thin by design (per project decision: keep it simple, no
// business logic lives here). Its main job is reading and writing a single
// JSON file in the OS app-data directory. All scheduling/completion logic
// lives in the TypeScript domain layer (src/domain) and is fully tested
// independently of this file. One deliberate exception:
// `send_reminder_notification` calls `notify-rust` directly to reach
// Windows toast options (urgency/sound) that `tauri-plugin-notification`'s
// desktop path doesn't expose.

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

/// Fires an OS toast notification, bypassing `tauri-plugin-notification`'s
/// desktop path. That plugin only forwards title/body/icon/sound to the OS —
/// no way to reach a persistent, audible toast through its JS API. This
/// command exists specifically to get past that ceiling for reminders; it's
/// the one deliberate exception to this crate's otherwise-dumb, IO-only
/// design. Deliberately does NOT set a custom app_id (see the comment
/// inside the Windows function body) — that requires the process to be an
/// installed/registered app, which breaks delivery under `tauri dev`.
///
/// Windows builds the toast XML by hand via the `windows` crate instead of
/// going through `tauri_winrt_notification::Toast` or `notify-rust`. Both of
/// those were tried first and both failed to keep the toast pinned on
/// screen: `notify-rust` forces a conflicting `duration="short"` attribute
/// (see git history / CLAUDE.md), and even with that fixed by switching to
/// `tauri_winrt_notification::Toast` directly, the toast *still*
/// auto-dismissed after ~5s. Empirically confirmed (by firing raw WinRT
/// toasts via PowerShell) that `scenario="reminder"` alone does not pin a
/// toast on this OS build — Windows only honors "stays until dismissed" when
/// the toast also has a non-empty `<actions>` block with a
/// `activationType="system"` dismiss action. `tauri_winrt_notification`'s
/// `add_button()` only ever emits `activationType`-less (i.e. "foreground")
/// buttons, which would try to activate/launch the app on click instead of
/// just dismissing — not acceptable for a borrowed AUMID with no registered
/// activation handler. Hence: raw XML + the `windows` crate directly, so the
/// `activationType="system"` attribute can actually be set.
///
/// Clicking the toast body (default "foreground" activation, distinct from
/// the "system" dismiss action above) focuses the main window. This does NOT
/// rely on the borrowed AUMID's app-activation/launch path (which has no
/// registered handler and can't reach this process) — instead it subscribes
/// to the `Activated` event directly on the `ToastNotification` COM object
/// before showing it, which fires as an in-process callback regardless of
/// AUMID registration. That object is intentionally leaked (`Box::leak`)
/// so the subscription outlives this function call; see the comment at the
/// leak site.
#[cfg(windows)]
#[tauri::command]
fn send_reminder_notification(
    app_handle: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    use windows::core::HSTRING;
    use windows::Data::Xml::Dom::XmlDocument;
    use windows::Foundation::TypedEventHandler;
    use windows::UI::Notifications::{ToastNotification, ToastNotificationManager};

    // Same AUMID caveat as always: a custom app_id needs the process to be
    // an installed/registered app (Start Menu shortcut), which a `tauri dev`
    // build isn't. This borrowed PowerShell AUMID is always pre-registered,
    // so delivery is reliable at the cost of the toast heading reading
    // "Windows PowerShell" instead of "Habit Tracker".
    const POWERSHELL_APP_ID: &str =
        "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe";

    let xml = format!(
        r#"<toast scenario="reminder">
            <visual>
                <binding template="ToastGeneric">
                    <text>{title}</text>
                    <text>{body}</text>
                </binding>
            </visual>
            <audio src="ms-winsoundevent:Notification.Reminder" />
            <actions>
                <action content="Dismiss" arguments="dismiss" activationType="system" />
            </actions>
        </toast>"#,
        title = xml_escape_text(&title),
        body = xml_escape_text(&body),
    );

    let doc = XmlDocument::new().map_err(|e| format!("Failed to create XML document: {e}"))?;
    doc.LoadXml(&HSTRING::from(xml))
        .map_err(|e| format!("Failed to parse toast XML: {e}"))?;

    let toast = ToastNotification::CreateToastNotification(&doc)
        .map_err(|e| format!("Failed to create toast notification: {e}"))?;

    // Bring the (already-running) app window to the front when the user
    // clicks the toast body. This fires as a direct in-process COM callback
    // on this `ToastNotification` object — it does NOT go through the
    // borrowed AUMID's app-activation/launch path, so it works even though
    // that AUMID has no registered activation handler of its own. The
    // tradeoff: the `ToastNotification` (and its Activated subscription)
    // must stay alive after this function returns for the callback to ever
    // fire, so it's intentionally leaked below rather than dropped — one toast
    // is small and reminders fire infrequently, so this is not a real leak
    // in practice.
    let activation_app_handle = app_handle.clone();
    let activated_handler = TypedEventHandler::new(move |_sender, _args| {
        if let Some(window) = activation_app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        Ok(())
    });
    toast
        .Activated(&activated_handler)
        .map_err(|e| format!("Failed to subscribe to toast activation: {e}"))?;

    let notifier =
        ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(POWERSHELL_APP_ID))
            .map_err(|e| format!("Failed to create toast notifier: {e}"))?;

    // Leak intentionally: see the comment above the Activated subscription.
    let toast: &'static ToastNotification = Box::leak(Box::new(toast));

    notifier
        .Show(toast)
        .map_err(|e| format!("Failed to show notification: {e}"))
}

/// Escapes text-node content for the hand-built toast XML above. Only `&`,
/// `<`, `>` matter inside a `<text>` element (unlike attribute values, quotes
/// don't need escaping here).
#[cfg(windows)]
fn xml_escape_text(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

#[cfg(not(windows))]
#[tauri::command]
fn send_reminder_notification(title: String, body: String) -> Result<(), String> {
    use notify_rust::{Notification, Urgency};
    Notification::new()
        .summary(&title)
        .body(&body)
        .urgency(Urgency::Critical)
        .sound_name("Reminder")
        .show()
        .map(|_| ())
        .map_err(|e| format!("Failed to show notification: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            load_data,
            save_data,
            backup_data,
            send_reminder_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
