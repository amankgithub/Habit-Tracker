import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Tauri bridge before importing storage.ts, since no real Tauri
// runtime exists in a unit test environment. Each test configures what
// `invoke` should return/throw to simulate a specific disk state.
const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

// Import AFTER the mock is registered.
const { loadData, saveData } = await import('../storage');

beforeEach(() => {
  invokeMock.mockReset();
});

describe('loadData', () => {
  it('returns empty data (no fallback flag) on first launch when file is missing', async () => {
    invokeMock.mockResolvedValueOnce(null); // Rust returns None -> null
    const result = await loadData();
    expect(result.recoveredFromFallback).toBe(false);
    expect(result.data.habits).toEqual([]);
    expect(result.data.completions).toEqual([]);
  });

  it('parses and returns valid existing data untouched', async () => {
    const validData = {
      habits: [{ id: 'h1', name: 'Exercise', order: 0, createdAt: '2026-07-01', archivedAt: null, scheduleHistory: [] }],
      completions: [{ habitId: 'h1', date: '2026-07-01' }],
      settings: { weekStartsOn: 1, theme: 'dark' },
    };
    invokeMock.mockResolvedValueOnce(JSON.stringify(validData));
    const result = await loadData();
    expect(result.recoveredFromFallback).toBe(false);
    expect(result.data.habits).toHaveLength(1);
    expect(result.data.habits[0].name).toBe('Exercise');
  });

  it('falls back to empty data on malformed JSON without throwing', async () => {
    invokeMock.mockResolvedValueOnce('{ this is not valid json !!!');
    const result = await loadData();
    expect(result.recoveredFromFallback).toBe(true);
    expect(result.fallbackReason).toBe('corrupted');
    expect(result.data.habits).toEqual([]);
  });

  it('falls back to empty data when JSON is valid but wrong shape', async () => {
    invokeMock.mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));
    const result = await loadData();
    expect(result.recoveredFromFallback).toBe(true);
    expect(result.fallbackReason).toBe('invalid_shape');
  });

  it('falls back to empty data when the Rust command itself throws', async () => {
    invokeMock.mockRejectedValueOnce(new Error('permission denied'));
    const result = await loadData();
    expect(result.recoveredFromFallback).toBe(true);
    expect(result.fallbackReason).toBe('read_error');
    expect(result.data.habits).toEqual([]);
  });

  it('never throws, regardless of failure mode', async () => {
    invokeMock.mockRejectedValueOnce(new Error('disk on fire'));
    await expect(loadData()).resolves.toBeDefined();
  });
});

describe('saveData', () => {
  it('serializes AppData and invokes save_data with the json payload', async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    const data = {
      habits: [],
      completions: [],
      settings: { weekStartsOn: 1 as const, theme: 'dark' as const, reminders: [] },
    };
    await saveData(data);
    expect(invokeMock).toHaveBeenCalledWith('save_data', { json: JSON.stringify(data) });
  });
});
