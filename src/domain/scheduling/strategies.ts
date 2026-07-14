import type {
  DailyConfig,
  EveryXDaysConfig,
  ISODate,
  SpecificWeekdaysConfig,
  TimesPerMonthConfig,
  TimesPerWeekConfig,
} from '../types';
import type { ScheduleStrategy } from './types';
import { diffInDays, dayOfWeek, startOfWeekMonday } from '../dateUtils';

export const dailyStrategy: ScheduleStrategy<DailyConfig> = {
  isScheduled(_config, _date) {
    return true;
  },
  getMonthlyDenominator(_config, monthDates) {
    return monthDates.length;
  },
};

export const everyXDaysStrategy: ScheduleStrategy<EveryXDaysConfig> = {
  isScheduled(config, date) {
    if (config.interval <= 0) return false;
    const delta = diffInDays(date, config.startDate);
    return delta >= 0 && delta % config.interval === 0;
  },
  getMonthlyDenominator(config, monthDates) {
    return monthDates.filter((d) => everyXDaysStrategy.isScheduled(config, d)).length;
  },
};

export const specificWeekdaysStrategy: ScheduleStrategy<SpecificWeekdaysConfig> = {
  isScheduled(config, date) {
    return config.weekdays.includes(dayOfWeek(date));
  },
  getMonthlyDenominator(config, monthDates) {
    return monthDates.filter((d) => specificWeekdaysStrategy.isScheduled(config, d)).length;
  },
};

/**
 * Quota-based: every day within the active range gets a checkbox (the user
 * is never locked out of logging a day). The denominator is the quota
 * itself, multiplied by the number of distinct Monday-starting weeks that
 * touch the given month — a habit that spans a month boundary contributes
 * its quota once per week-bucket that overlaps the month.
 */
export const timesPerWeekStrategy: ScheduleStrategy<TimesPerWeekConfig> = {
  isScheduled(_config, _date) {
    return true;
  },
  getMonthlyDenominator(config, monthDates) {
    const weekBuckets = new Set(monthDates.map((d) => startOfWeekMonday(d)));
    return config.count * weekBuckets.size;
  },
};

export const timesPerMonthStrategy: ScheduleStrategy<TimesPerMonthConfig> = {
  isScheduled(_config, _date) {
    return true;
  },
  getMonthlyDenominator(config, _monthDates) {
    return config.count;
  },
};
