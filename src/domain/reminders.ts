import type { ReminderRule } from './types';

/** Parses "HH:mm" into minutes since midnight. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Formats minutes since midnight back to "HH:mm". */
function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Expands one rule into the list of "HH:mm" times it fires on any given day.
 * `interval` walks startTime..endTime stepping by intervalMinutes, inclusive
 * of endTime only when it lands exactly on a step.
 */
export function expandRuleToTimes(rule: ReminderRule): string[] {
  if (rule.kind === 'fixed') {
    return [rule.time];
  }

  const start = toMinutes(rule.startTime);
  const end = toMinutes(rule.endTime);
  const step = rule.intervalMinutes;
  if (step <= 0 || end < start) return [];

  const times: string[] = [];
  for (let t = start; t <= end; t += step) {
    times.push(fromMinutes(t));
  }
  return times;
}

/** Flattens + dedupes + sorts every rule's occurrences for "today". */
export function getTodaysReminderTimes(rules: ReminderRule[]): string[] {
  const all = rules.flatMap(expandRuleToTimes);
  return Array.from(new Set(all)).sort();
}
