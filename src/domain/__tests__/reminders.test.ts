import { describe, it, expect } from 'vitest';
import type { ReminderRule } from '../types';
import { expandRuleToTimes, getTodaysReminderTimes } from '../reminders';

describe('expandRuleToTimes', () => {
  it('fixed rule passes through its single time', () => {
    const rule: ReminderRule = { id: 'a', kind: 'fixed', time: '08:00' };
    expect(expandRuleToTimes(rule)).toEqual(['08:00']);
  });

  it('interval rule steps evenly between start and end, inclusive', () => {
    const rule: ReminderRule = {
      id: 'b',
      kind: 'interval',
      startTime: '14:00',
      endTime: '22:00',
      intervalMinutes: 120,
    };
    expect(expandRuleToTimes(rule)).toEqual(['14:00', '16:00', '18:00', '20:00', '22:00']);
  });

  it('interval rule that does not evenly divide the range stops before endTime', () => {
    const rule: ReminderRule = {
      id: 'c',
      kind: 'interval',
      startTime: '09:00',
      endTime: '10:30',
      intervalMinutes: 45,
    };
    expect(expandRuleToTimes(rule)).toEqual(['09:00', '09:45', '10:30']);
  });

  it('returns empty when endTime is before startTime or interval is non-positive', () => {
    expect(
      expandRuleToTimes({ id: 'd', kind: 'interval', startTime: '10:00', endTime: '09:00', intervalMinutes: 30 })
    ).toEqual([]);
    expect(
      expandRuleToTimes({ id: 'e', kind: 'interval', startTime: '09:00', endTime: '10:00', intervalMinutes: 0 })
    ).toEqual([]);
  });
});

describe('getTodaysReminderTimes', () => {
  it('flattens, dedupes, and sorts across multiple rules', () => {
    const rules: ReminderRule[] = [
      { id: 'a', kind: 'fixed', time: '08:00' },
      { id: 'b', kind: 'interval', startTime: '14:00', endTime: '18:00', intervalMinutes: 120 },
      { id: 'c', kind: 'fixed', time: '14:00' },
    ];
    expect(getTodaysReminderTimes(rules)).toEqual(['08:00', '14:00', '16:00', '18:00']);
  });

  it('returns an empty list for no rules', () => {
    expect(getTodaysReminderTimes([])).toEqual([]);
  });
});
