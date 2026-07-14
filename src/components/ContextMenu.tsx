import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  type?: 'item';
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface ContextMenuSeparator {
  type: 'separator';
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

/**
 * Generic right-click (and kebab-button-triggered) popup menu. Positioned
 * at the given viewport coordinates and clamped so it never renders off
 * the edge of the window. Portaled to document.body so it isn't clipped by
 * an ancestor's `overflow-x-auto` (the grid rows scroll horizontally).
 * Closes on click-outside, Escape, or scroll — matches ScheduleTypePicker's
 * dropdown-dismiss behavior.
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number; opacity: number }>({
    top: y,
    left: x,
    opacity: 0,
  });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { innerWidth, innerHeight } = window;
    const rect = el.getBoundingClientRect();
    const left = Math.min(x, innerWidth - rect.width - 8);
    const top = Math.min(y, innerHeight - rect.height - 8);
    setStyle({ top: Math.max(8, top), left: Math.max(8, left), opacity: 1 });
  }, [x, y]);

  useLayoutEffect(() => {
    // Deliberately does NOT also listen for 'contextmenu' here (only
    // 'mousedown', which already covers "right-click elsewhere closes the
    // menu" since a right-click starts with a mousedown too). Registering a
    // second 'contextmenu' listener caused a same-event self-close bug: the
    // triggering right-click event is often still bubbling past `document`
    // at the moment React's synchronous commit runs this effect, so the
    // freshly-attached listener would catch that same in-flight event and
    // immediately close the menu it had just opened.
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function handleScroll() {
      onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: style.top, left: style.left, opacity: style.opacity }}
      className="fixed z-50 min-w-[160px] bg-surface border border-border rounded-card shadow-card
        overflow-hidden py-1 animate-dropdown-in"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((entry, i) =>
        entry.type === 'separator' ? (
          <div key={`sep-${i}`} className="my-1 border-t border-border/60" />
        ) : (
          <button
            key={entry.label}
            type="button"
            disabled={entry.disabled}
            onClick={() => {
              entry.onClick();
              onClose();
            }}
            className={`w-full text-left px-3 py-1.5 text-[13px] font-ui transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              ${
                entry.variant === 'danger'
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-text hover:bg-surfaceRaised'
              }`}
          >
            {entry.label}
          </button>
        )
      )}
    </div>,
    document.body
  );
}
