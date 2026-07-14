import type {
  EveryXDaysConfig,
  SpecificWeekdaysConfig,
  TimesPerMonthConfig,
  TimesPerWeekConfig,
} from '../../domain/types';

const inputClass =
  'bg-surfaceRaised border border-border rounded-cell px-2.5 py-1.5 text-[13px] font-data text-text ' +
  'focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed w-full';

interface DisableableProps {
  disabled?: boolean;
}

export function DailyConfigForm(_props: DisableableProps) {
  return <p className="text-[13px] text-textMuted font-ui">Scheduled every single day.</p>;
}

export function EveryXDaysConfigForm({
  config,
  onChange,
  disabled,
}: DisableableProps & { config: EveryXDaysConfig; onChange: (c: EveryXDaysConfig) => void }) {
  return (
    <div className="flex gap-3">
      <label className="flex-1">
        <span className="block text-[11px] text-textMuted font-ui mb-1">Every N days</span>
        <input
          type="number"
          min={1}
          disabled={disabled}
          value={config.interval}
          onChange={(e) => onChange({ ...config, interval: Math.max(1, Number(e.target.value)) })}
          className={inputClass}
        />
      </label>
      <label className="flex-1">
        <span className="block text-[11px] text-textMuted font-ui mb-1">Starting on</span>
        <input
          type="date"
          disabled={disabled}
          value={config.startDate}
          onChange={(e) => onChange({ ...config, startDate: e.target.value })}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export function TimesPerWeekConfigForm({
  config,
  onChange,
  disabled,
}: DisableableProps & { config: TimesPerWeekConfig; onChange: (c: TimesPerWeekConfig) => void }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-textMuted font-ui mb-1">Times per week (Mon–Sun)</span>
      <input
        type="number"
        min={1}
        disabled={disabled}
        value={config.count}
        onChange={(e) => onChange({ count: Math.max(1, Number(e.target.value)) })}
        className={inputClass}
      />
    </label>
  );
}

export function TimesPerMonthConfigForm({
  config,
  onChange,
  disabled,
}: DisableableProps & { config: TimesPerMonthConfig; onChange: (c: TimesPerMonthConfig) => void }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-textMuted font-ui mb-1">Times per month</span>
      <input
        type="number"
        min={1}
        disabled={disabled}
        value={config.count}
        onChange={(e) => onChange({ count: Math.max(1, Number(e.target.value)) })}
        className={inputClass}
      />
    </label>
  );
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SpecificWeekdaysConfigForm({
  config,
  onChange,
  disabled,
}: DisableableProps & { config: SpecificWeekdaysConfig; onChange: (c: SpecificWeekdaysConfig) => void }) {
  function toggle(day: number) {
    if (disabled) return;
    const has = config.weekdays.includes(day);
    const weekdays = has ? config.weekdays.filter((d) => d !== day) : [...config.weekdays, day].sort();
    onChange({ weekdays });
  }

  return (
    <div>
      <span className="block text-[11px] text-textMuted font-ui mb-1.5">Days of the week</span>
      <div className="flex gap-1.5">
        {WEEKDAY_LABELS.map((label, day) => {
          const active = config.weekdays.includes(day);
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => toggle(day)}
              className={`w-9 h-8 rounded-cell text-[11px] font-data transition-colors
                disabled:cursor-not-allowed
                ${
                  active
                    ? 'bg-accent text-bg font-medium'
                    : 'bg-surfaceRaised border border-border text-textMuted hover:text-text'
                }`}
            >
              {label[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
