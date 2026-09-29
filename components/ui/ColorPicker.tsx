import React from 'react';
import { CheckIcon } from '@/components/icons';

export const HABIT_COLOR_PALETTE = [
  { hex: '#2E7D6B', label: 'Forest Green (Primary)' },
  { hex: '#F4A259', label: 'Warm Amber (Accent)' },
  { hex: '#3B82F6', label: 'Soft Blue' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#EC4899', label: 'Rose Pink' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#06B6D4', label: 'Teal' },
  { hex: '#F59E0B', label: 'Gold' },
  { hex: '#6366F1', label: 'Indigo' },
  { hex: '#64748B', label: 'Slate' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-2.5">
        {HABIT_COLOR_PALETTE.map((color) => {
          const isSelected = value.toLowerCase() === color.hex.toLowerCase();
          return (
            <button
              key={color.hex}
              type="button"
              onClick={() => onChange(color.hex)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus-visible:outline-[var(--color-primary)] ${
                isSelected ? 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-105' : ''
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.label}
              aria-label={color.label}
            >
              {isSelected && (
                <CheckIcon size={16} className="text-white drop-shadow-sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
