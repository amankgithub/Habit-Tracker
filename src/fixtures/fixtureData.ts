import { addDays, format } from 'date-fns';
import type { AppData, CompletionRecord } from '../domain/types';
import { createEmptyAppData } from '../domain/types';
import { createHabit } from '../domain/habitActions';
import { todayISO } from '../domain/dateUtils';

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function daysAgo(n: number): string {
  return iso(addDays(new Date(), -n));
}

/**
 * Builds a realistic AppData snapshot exercising every schedule type and
 * the trickier edge cases (mid-month creation, quota overage, missed days)
 * so the static UI shell has something honest to render — not just happy
 * -path fixture data.
 */
export function buildFixtureData(): AppData {
  let data: AppData = createEmptyAppData();

  data = createHabit(data, {
    name: 'Morning Meditation',
    type: 'daily',
    config: {},
    createdAt: daysAgo(14),
  });

  data = createHabit(data, {
    name: 'Read 20 Pages',
    type: 'specificWeekdays',
    config: { weekdays: [1, 3, 5] }, // Mon/Wed/Fri
    createdAt: daysAgo(14),
  });

  data = createHabit(data, {
    name: 'Deep Clean Kitchen',
    type: 'everyXDays',
    config: { interval: 3, startDate: daysAgo(9) },
    createdAt: daysAgo(9),
  });

  data = createHabit(data, {
    name: 'Gym Sessions',
    type: 'timesPerWeek',
    config: { count: 4 },
    createdAt: daysAgo(14),
  });

  data = createHabit(data, {
    name: 'Learn Spanish',
    type: 'daily',
    config: {},
    createdAt: daysAgo(4), // mid-month creation — earlier cells intentionally blank
  });

  data = createHabit(data, {
    name: 'Call Family',
    type: 'timesPerMonth',
    config: { count: 8 },
    createdAt: daysAgo(14),
  });

  const habitsByName = Object.fromEntries(data.habits.map((h) => [h.name, h.id]));

  const completions: CompletionRecord[] = [];

  // Morning Meditation: mostly consistent, with two intentionally missed
  // days so the grid shows real empty-checkbox states, not a perfect streak.
  for (let i = 14; i >= 1; i--) {
    if (i === 6 || i === 3) continue; // missed
    completions.push({ habitId: habitsByName['Morning Meditation'], date: daysAgo(i) });
  }

  // Read 20 Pages: completed on most Mon/Wed/Fri in range, one missed.
  for (let i = 14; i >= 1; i--) {
    const d = addDays(new Date(), -i);
    const dow = d.getDay();
    if ([1, 3, 5].includes(dow) && i !== 8) {
      completions.push({ habitId: habitsByName['Read 20 Pages'], date: iso(d) });
    }
  }

  // Deep Clean Kitchen: every-3-days habit, completed on its actual due days.
  for (let i = 9; i >= 0; i -= 3) {
    completions.push({ habitId: habitsByName['Deep Clean Kitchen'], date: daysAgo(i) });
  }

  // Gym Sessions: quota is 4/week, but this week the user overachieved —
  // demonstrates the uncapped progress fraction (can exceed 100%).
  for (let i = 4; i >= 0; i--) {
    completions.push({ habitId: habitsByName['Gym Sessions'], date: daysAgo(i) });
  }

  // Learn Spanish: created 4 days ago, completed every day since —
  // demonstrates mid-month creation (earlier days show no checkbox at all).
  for (let i = 4; i >= 0; i--) {
    completions.push({ habitId: habitsByName['Learn Spanish'], date: daysAgo(i) });
  }

  // Call Family: monthly quota of 8, a handful done so far.
  for (const i of [12, 8, 5, 2]) {
    completions.push({ habitId: habitsByName['Call Family'], date: daysAgo(i) });
  }

  return { ...data, completions };
}

export const FIXTURE_DATA = buildFixtureData();
export const FIXTURE_TODAY = todayISO();
