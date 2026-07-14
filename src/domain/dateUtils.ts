import {
  differenceInCalendarDays,
  parseISO,
  format,
  getDate,
  getDaysInMonth as dfGetDaysInMonth,
  startOfMonth,
  addDays,
  getDay,
  isAfter,
  isBefore,
  isEqual,
} from 'date-fns';
import type { ISODate } from './types';

/** Formats a Date as an ISO "YYYY-MM-DD" string. */
export function toISODate(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

/** Parses an ISO "YYYY-MM-DD" string into a Date (local time, midnight). */
export function fromISODate(date: ISODate): Date {
  return parseISO(date);
}

/** Today's date as an ISO string. Single source of truth for "today". */
export function todayISO(): ISODate {
  return toISODate(new Date());
}

/** Current month key, e.g. "2026-07". */
export function monthKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM');
}

export function monthKeyFromISODate(date: ISODate): string {
  return monthKey(fromISODate(date));
}

/** Number of calendar days in the month containing the given date. */
export function daysInMonth(date: Date): number {
  return dfGetDaysInMonth(date);
}

/** Returns every ISO date string for the month containing `date`. */
export function allDatesInMonth(date: Date): ISODate[] {
  const start = startOfMonth(date);
  const total = daysInMonth(date);
  const result: ISODate[] = [];
  for (let i = 0; i < total; i++) {
    result.push(toISODate(addDays(start, i)));
  }
  return result;
}

/** Day-of-month number (1-31) for an ISO date. */
export function dayOfMonth(date: ISODate): number {
  return getDate(fromISODate(date));
}

/** Day of week, 0=Sunday..6=Saturday, matching JS/date-fns convention. */
export function dayOfWeek(date: ISODate): number {
  return getDay(fromISODate(date));
}

/** Inclusive day count between two ISO dates (b - a), can be negative. */
export function diffInDays(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(fromISODate(a), fromISODate(b));
}

/**
 * Returns the ISO date of the Monday that starts the week containing `date`,
 * since weekStartsOn is fixed to Monday for this app.
 */
export function startOfWeekMonday(date: ISODate): ISODate {
  const d = fromISODate(date);
  const dow = getDay(d); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return toISODate(addDays(d, diffToMonday));
}

export function isDateOnOrAfter(date: ISODate, reference: ISODate): boolean {
  const d = fromISODate(date);
  const r = fromISODate(reference);
  return isEqual(d, r) || isAfter(d, r);
}

export function isDateBefore(date: ISODate, reference: ISODate): boolean {
  return isBefore(fromISODate(date), fromISODate(reference));
}
