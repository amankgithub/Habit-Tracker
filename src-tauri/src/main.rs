#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Entry point only — all real logic lives in lib.rs so it can also be
// reused by the mobile entry point macro if this ever targets mobile.
fn main() {
    habit_tracker_lib::run();
}