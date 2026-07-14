import type { ScheduleConfig, ScheduleType } from '../../domain/types';
import { todayISO } from '../../domain/dateUtils';
import {
  DailyConfigForm,
  EveryXDaysConfigForm,
  SpecificWeekdaysConfigForm,
  TimesPerMonthConfigForm,
  TimesPerWeekConfigForm,
} from './scheduleConfigForms';

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  daily: 'Daily',
  everyXDays: 'Every X Days',
  timesPerWeek: 'X Times / Week',
  timesPerMonth: 'X Times / Month',
  specificWeekdays: 'Specific Weekdays',
};

export const SCHEDULE_TYPE_ORDER: ScheduleType[] = [
  'daily',
  'everyXDays',
  'timesPerWeek',
  'timesPerMonth',
  'specificWeekdays',
];

/** Sensible starting values when a type is first selected. */
export function defaultConfigForType(type: ScheduleType): ScheduleConfig {
  switch (type) {
    case 'daily':
      return {};
    case 'everyXDays':
      return { interval: 2, startDate: todayISO() };
    case 'timesPerWeek':
      return { count: 3 };
    case 'timesPerMonth':
      return { count: 12 };
    case 'specificWeekdays':
      return { weekdays: [1, 3, 5] };
  }
}

interface ScheduleConfigFormProps {
  type: ScheduleType;
  config: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
  disabled?: boolean;
}

/** Renders the correct config form for whichever type is active — used
 * both for the real, committed form and for the hover-preview flyout
 * (via `disabled`), so the preview is never visually out of sync with
 * what you'd actually get. */
export function ScheduleConfigForm({ type, config, onChange, disabled }: ScheduleConfigFormProps) {
  switch (type) {
    case 'daily':
      return <DailyConfigForm disabled={disabled} />;
    case 'everyXDays':
      return (
        <EveryXDaysConfigForm
          disabled={disabled}
          config={config as any}
          onChange={onChange as any}
        />
      );
    case 'timesPerWeek':
      return (
        <TimesPerWeekConfigForm
          disabled={disabled}
          config={config as any}
          onChange={onChange as any}
        />
      );
    case 'timesPerMonth':
      return (
        <TimesPerMonthConfigForm
          disabled={disabled}
          config={config as any}
          onChange={onChange as any}
        />
      );
    case 'specificWeekdays':
      return (
        <SpecificWeekdaysConfigForm
          disabled={disabled}
          config={config as any}
          onChange={onChange as any}
        />
      );
  }
}
