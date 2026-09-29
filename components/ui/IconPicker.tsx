import React from 'react';
import { HABIT_ICONS_LIST, HabitIcon } from '@/components/icons';

interface IconPickerProps {
  value: string;
  onChange: (iconKey: string) => void;
  label?: string;
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </span>
      )}
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2 border border-[var(--color-border)] rounded max-h-48 overflow-y-auto">
        {HABIT_ICONS_LIST.map((icon) => {
          const isSelected = value === icon.key;
          return (
            <button
              key={icon.key}
              type="button"
              onClick={() => onChange(icon.key)}
              className={`p-2 rounded flex flex-col items-center justify-center transition-colors focus-visible:outline-[var(--color-primary)] ${
                isSelected
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/20'
              }`}
              title={icon.label}
              aria-label={icon.label}
            >
              <HabitIcon iconKey={icon.key} size={22} />
              <span className="text-[10px] mt-1 truncate max-w-full">{icon.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
