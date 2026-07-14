import { useEffect, useRef, useState } from 'react';
import type { ScheduleConfig, ScheduleType } from '../../domain/types';
import {
  SCHEDULE_TYPE_LABELS,
  SCHEDULE_TYPE_ORDER,
  ScheduleConfigForm,
  defaultConfigForType,
} from './ScheduleConfigForm';

interface ScheduleTypePickerProps {
  type: ScheduleType;
  config: ScheduleConfig;
  onChange: (type: ScheduleType, config: ScheduleConfig) => void;
}

/**
 * Dropdown of the 5 schedule types. Clicking an option commits it: the
 * dropdown closes, and that type's config form renders inline below the
 * trigger, as a normal part of the form — it stays there while you fill
 * it in and only changes if you reopen the dropdown and pick a different
 * type. (No hover-preview flyout — removed per feedback; it added visual
 * noise without enough payoff for a 5-option list.)
 */
export function ScheduleTypePicker({ type, config, onChange }: ScheduleTypePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function commitType(newType: ScheduleType) {
    // Keep existing config if the type didn't actually change (e.g. user
    // reopened the dropdown and clicked the already-selected type) —
    // otherwise seed sensible defaults for the newly chosen type.
    const nextConfig = newType === type ? config : defaultConfigForType(newType);
    onChange(newType, nextConfig);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <span className="block text-[11px] text-textMuted font-ui mb-1">Schedule</span>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-surfaceRaised border border-border
          rounded-cell px-3 py-2 text-[13px] font-ui text-text hover:border-accent/50 transition-colors"
      >
        {SCHEDULE_TYPE_LABELS[type]}
        <span className={`text-textMuted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {isOpen && (
        <ul
          className="absolute z-20 top-full mt-1 left-0 w-full bg-surface border border-border
            rounded-card shadow-card overflow-hidden py-1 animate-dropdown-in"
        >
          {SCHEDULE_TYPE_ORDER.map((optionType) => (
            <li key={optionType}>
              <button
                type="button"
                onClick={() => commitType(optionType)}
                className={`w-full text-left px-3 py-2 text-[13px] font-ui transition-colors
                  ${
                    optionType === type
                      ? 'text-accent bg-accent/10'
                      : 'text-text hover:bg-surfaceRaised'
                  }`}
              >
                {SCHEDULE_TYPE_LABELS[optionType]}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* The real, committed config form — stays rendered here regardless
          of dropdown open/closed state once a type is selected. */}
      <div className="mt-3">
        <ScheduleConfigForm type={type} config={config} onChange={(c) => onChange(type, c)} />
      </div>
    </div>
  );
}
