import { invoke } from '@tauri-apps/api/core';
import type { AppData } from '../domain/types';
import { createEmptyAppData } from '../domain/types';

/**
 * Minimal structural validation — not a full schema validator, just enough
 * to catch "this isn't even the right shape" before it's trusted as AppData.
 * Deliberately loose: the domain layer already tolerates habits with no
 * completions, empty arrays, etc. This only guards against genuinely
 * corrupted or foreign JSON (e.g. an empty object, a truncated write, or a
 * user accidentally opening the wrong file).
 */
function isValidAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.habits) && Array.isArray(v.completions) && typeof v.settings === 'object';
}

export interface LoadResult {
  data: AppData;
  /** True if the file was missing, corrupted, or invalid and we fell back
   * to empty data. Lets the UI show a one-time "started fresh" notice
   * instead of silently discarding a user's data without them knowing. */
  recoveredFromFallback: boolean;
  /** Present only when recoveredFromFallback is true due to an actual
   * error (corrupted/invalid), as opposed to a normal first launch. */
  fallbackReason?: 'missing' | 'corrupted' | 'invalid_shape' | 'read_error';
}

/**
 * Loads AppData from disk via the Rust backend. Never throws — any failure
 * mode (missing file, malformed JSON, wrong shape, IO error) resolves to a
 * safe empty AppData rather than crashing the app on launch.
 */
export async function loadData(): Promise<LoadResult> {
  let raw: string | null;

  try {
    raw = await invoke<string | null>('load_data');
  } catch (err) {
    console.warn('[storage] Failed to read data file, starting with empty data.', err);
    return { data: createEmptyAppData(), recoveredFromFallback: true, fallbackReason: 'read_error' };
  }

  if (raw === null) {
    // Normal case: first launch, no file yet. Not an error.
    return { data: createEmptyAppData(), recoveredFromFallback: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn('[storage] Data file contained invalid JSON, starting with empty data.', err);
    return { data: createEmptyAppData(), recoveredFromFallback: true, fallbackReason: 'corrupted' };
  }

  if (!isValidAppData(parsed)) {
    console.warn('[storage] Data file did not match the expected shape, starting with empty data.');
    return { data: createEmptyAppData(), recoveredFromFallback: true, fallbackReason: 'invalid_shape' };
  }

  return { data: parsed, recoveredFromFallback: false };
}

/**
 * Persists AppData to disk. The Rust side writes atomically (temp file +
 * rename), so a crash mid-save can't corrupt the existing file — worst
 * case, the save is simply lost and the previous good file remains.
 */
export async function saveData(data: AppData): Promise<void> {
  const json = JSON.stringify(data);
  await invoke('save_data', { json });
}

/** Optional safety net — not wired into any UI flow yet. */
export async function backupData(): Promise<string | null> {
  return invoke<string | null>('backup_data');
}
