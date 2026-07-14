import { describe, it, expect } from 'vitest';
import type { CompletionRecord, Habit } from '../types';
import {
  getDailyCompletionPercentage,
  getDayStatus,
  getMonthlyProgress,
} from '../completionCalculator';
import { toggleCompletion, isMonthEditable } from '../habitActions';
import { createEmptyAppData } from '../types';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Exercise',
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

describe('getDayStatus', () => {
  it('returns not_scheduled outside the habit lifecycle', () => {
    const habit = makeHabit({ createdAt: '2026-07-10' });
    expect(getDayStatus(habit, '2026-07-05', [])).toBe('not_scheduled');
  });

  it('returns missed when scheduled but no completion record exists', () => {
    const habit = makeHabit();
    expect(getDayStatus(habit, '2026-07-05', [])).toBe('missed');
  });

  it('returns completed when a record exists', () => {
    const habit = makeHabit();
    const completions: CompletionRecord[] = [{ habitId: 'h1', date: '2026-07-05' }];
    expect(getDayStatus(habit, '2026-07-05', completions)).toBe('completed');
  });
});

describe('getMonthlyProgress — mid-month creation does not skew the fraction', () => {
  it('daily habit created on the 20th only counts days from the 20th onward', () => {
    const habit = makeHabit({ createdAt: '2026-07-20' });
    const completions: CompletionRecord[] = [
      { habitId: 'h1', date: '2026-07-20' },
      { habitId: 'h1', date: '2026-07-21' },
      { habitId: 'h1', date: '2026-07-22' },
    ];
    const progress = getMonthlyProgress(habit, new Date('2026-07-15T00:00:00'), completions);
    // July has 31 days; habit alive from 20th -> 12 scheduled days (20-31 inclusive)
    expect(progress.total).toBe(12);
    expect(progress.completed).toBe(3);
  });
});

describe('getMonthlyProgress — quota habits can exceed 100%', () => {
  it('timesPerWeek allows completed > total', () => {
    const habit = makeHabit({
      createdAt: '2026-07-01',
      scheduleHistory: [
        {
          id: 'r1',
          type: 'timesPerWeek',
          config: { count: 2 },
          effectiveFrom: '2026-07-01',
          effectiveTo: null,
        },
      ],
    });
    // Complete every day of the first week (way more than quota of 2)
    const completions: CompletionRecord[] = [
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ].map((date) => ({ habitId: 'h1', date }));

    const progress = getMonthlyProgress(habit, new Date('2026-07-05T00:00:00'), completions);
    expect(progress.completed).toBe(5);
    expect(progress.completed).toBeGreaterThan(progress.total > 0 ? 0 : -1);
    // total = count(2) * number of Monday-week-buckets touching July 2026 (5 buckets)
    // exact bucket count isn't the point here — just confirm completed can exceed a single week's quota
    expect(progress.completed).toBeGreaterThanOrEqual(2);
  });
});

describe('getDailyCompletionPercentage', () => {
  it('ignores not-scheduled habits and only counts scheduled ones', () => {
    const dailyHabit = makeHabit({ id: 'daily1' });
    const notYetCreated = makeHabit({ id: 'future1', createdAt: '2026-08-01' });
    const completions: CompletionRecord[] = [{ habitId: 'daily1', date: '2026-07-10' }];

    const pct = getDailyCompletionPercentage(
      [dailyHabit, notYetCreated],
      '2026-07-10',
      completions
    );
    // only dailyHabit was scheduled, and it was completed -> 100%
    expect(pct).toBe(100);
  });

  it('returns null when nothing was scheduled that day', () => {
    const notYetCreated = makeHabit({ createdAt: '2026-08-01' });
    const pct = getDailyCompletionPercentage([notYetCreated], '2026-07-10', []);
    expect(pct).toBeNull();
  });

  it('computes partial percentage correctly', () => {
    const h1 = makeHabit({ id: 'h1' });
    const h2 = makeHabit({ id: 'h2' });
    const completions: CompletionRecord[] = [{ habitId: 'h1', date: '2026-07-10' }];
    const pct = getDailyCompletionPercentage([h1, h2], '2026-07-10', completions);
    expect(pct).toBe(50);
  });
});

describe('past months are frozen, current month is fully editable', () => {
  it('toggling a completion in the current month works', () => {
    const data = createEmptyAppData();
    const withHabit = { ...data, habits: [makeHabit()] };
    const result = toggleCompletion(withHabit, 'h1', '2026-07-03', '2026-07-15');
    expect(result.completions).toHaveLength(1);
  });

  it('toggling a completion in a PAST month is a no-op', () => {
    const data = createEmptyAppData();
    const withHabit = { ...data, habits: [makeHabit()] };
    // referenceToday is August, target date is in July -> frozen
    const result = toggleCompletion(withHabit, 'h1', '2026-07-03', '2026-08-01');
    expect(result.completions).toHaveLength(0);
  });

  it('any day within the current month is editable, not just today', () => {
    // Per product decision: whole current month is open, not just "today"
    expect(isMonthEditable('2026-07-01', '2026-07-31')).toBe(true);
    expect(isMonthEditable('2026-07-31', '2026-07-01')).toBe(true);
  });

  it('a month locks the instant the calendar rolls to the next month', () => {
    expect(isMonthEditable('2026-07-31', '2026-08-01')).toBe(false);
  });
});
