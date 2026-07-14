import { describe, it, expect } from 'vitest';
import type { Habit } from '../types';
import { isHabitScheduledOn } from '../scheduling/resolver';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test Habit',
    order: 0,
    createdAt: '2026-07-01',
    archivedAt: null,
    scheduleHistory: [
      {
        id: 'r1',
        type: 'daily',
        config: {},
        effectiveFrom: '2026-07-01',
        effectiveTo: null,
      },
    ],
    ...overrides,
  };
}

describe('daily schedule', () => {
  it('is scheduled every day from creation onward', () => {
    const habit = makeHabit();
    expect(isHabitScheduledOn(habit, '2026-07-01')).toBe(true);
    expect(isHabitScheduledOn(habit, '2026-07-15')).toBe(true);
  });

  it('is NOT scheduled before creation (mid-month creation edge case)', () => {
    const habit = makeHabit({ createdAt: '2026-07-10' });
    expect(isHabitScheduledOn(habit, '2026-07-09')).toBe(false);
    expect(isHabitScheduledOn(habit, '2026-07-10')).toBe(true);
  });

  it('is NOT scheduled on/after archival date', () => {
    const habit = makeHabit({ archivedAt: '2026-07-20' });
    expect(isHabitScheduledOn(habit, '2026-07-19')).toBe(true);
    expect(isHabitScheduledOn(habit, '2026-07-20')).toBe(false);
  });
});

describe('everyXDays schedule', () => {
  it('respects a custom, independent start date', () => {
    const habit = makeHabit({
      createdAt: '2026-07-01',
      scheduleHistory: [
        {
          id: 'r1',
          type: 'everyXDays',
          config: { interval: 3, startDate: '2026-06-25' },
          effectiveFrom: '2026-07-01',
          effectiveTo: null,
        },
      ],
    });
    // startDate 6/25, interval 3 -> scheduled on 6/25, 6/28, 7/1, 7/4, 7/7...
    expect(isHabitScheduledOn(habit, '2026-07-01')).toBe(true);
    expect(isHabitScheduledOn(habit, '2026-07-02')).toBe(false);
    expect(isHabitScheduledOn(habit, '2026-07-04')).toBe(true);
  });

  it('is not scheduled before its startDate even if habit already exists', () => {
    const habit = makeHabit({
      createdAt: '2026-07-01',
      scheduleHistory: [
        {
          id: 'r1',
          type: 'everyXDays',
          config: { interval: 2, startDate: '2026-07-10' },
          effectiveFrom: '2026-07-01',
          effectiveTo: null,
        },
      ],
    });
    expect(isHabitScheduledOn(habit, '2026-07-05')).toBe(false);
    expect(isHabitScheduledOn(habit, '2026-07-10')).toBe(true);
    expect(isHabitScheduledOn(habit, '2026-07-12')).toBe(true);
  });
});

describe('specificWeekdays schedule', () => {
  it('only matches configured weekdays', () => {
    // Mon/Wed/Fri = 1,3,5
    const habit = makeHabit({
      scheduleHistory: [
        {
          id: 'r1',
          type: 'specificWeekdays',
          config: { weekdays: [1, 3, 5] },
          effectiveFrom: '2026-07-01',
          effectiveTo: null,
        },
      ],
    });
    // 2026-07-06 is a Monday
    expect(isHabitScheduledOn(habit, '2026-07-06')).toBe(true);
    // 2026-07-07 is a Tuesday
    expect(isHabitScheduledOn(habit, '2026-07-07')).toBe(false);
  });
});

describe('quota schedules always show a checkbox', () => {
  it('timesPerWeek is scheduled every day, uncapped by count', () => {
    const habit = makeHabit({
      scheduleHistory: [
        {
          id: 'r1',
          type: 'timesPerWeek',
          config: { count: 3 },
          effectiveFrom: '2026-07-01',
          effectiveTo: null,
        },
      ],
    });
    for (const d of ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04']) {
      expect(isHabitScheduledOn(habit, d)).toBe(true);
    }
  });

  it('timesPerMonth is scheduled every day too', () => {
    const habit = makeHabit({
      scheduleHistory: [
        {
          id: 'r1',
          type: 'timesPerMonth',
          config: { count: 15 },
          effectiveFrom: '2026-07-01',
          effectiveTo: null,
        },
      ],
    });
    expect(isHabitScheduledOn(habit, '2026-07-31')).toBe(true);
  });
});

describe('mid-month schedule changes (versioned rules)', () => {
  it('applies the old rule before the switch date and the new rule after', () => {
    const habit = makeHabit({
      createdAt: '2026-07-01',
      scheduleHistory: [
        {
          id: 'r1',
          type: 'daily',
          config: {},
          effectiveFrom: '2026-07-01',
          effectiveTo: '2026-07-15',
        },
        {
          id: 'r2',
          type: 'specificWeekdays',
          config: { weekdays: [1] }, // Monday only
          effectiveFrom: '2026-07-15',
          effectiveTo: null,
        },
      ],
    });
    // Before switch: daily, so any day is scheduled
    expect(isHabitScheduledOn(habit, '2026-07-10')).toBe(true);
    // 2026-07-14 is a Tuesday but rule was still 'daily' then
    expect(isHabitScheduledOn(habit, '2026-07-14')).toBe(true);
    // After switch (7/15 onward): only Mondays. 7/15 is a Wednesday -> false
    expect(isHabitScheduledOn(habit, '2026-07-15')).toBe(false);
    // 2026-07-20 is a Monday -> true
    expect(isHabitScheduledOn(habit, '2026-07-20')).toBe(true);
  });
});
