interface ProgressBadgeProps {
  completed: number;
  total: number;
}

export function ProgressBadge({ completed, total }: ProgressBadgeProps) {
  const exceeded = total > 0 && completed > total;

  return (
    <div className="w-20 shrink-0 flex justify-end pr-3">
      <span
        className={`font-data text-[13px] tabular-nums ${
          exceeded ? 'text-accent' : 'text-textMuted'
        }`}
      >
        {completed}/{total}
      </span>
    </div>
  );
}
