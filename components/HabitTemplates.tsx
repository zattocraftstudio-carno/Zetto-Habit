import React from 'react';
import { HabitIcon } from '@/components/icons';
import { FrequencyType, GoalType } from '@/types';
import { usePrefs } from '@/components/PrefsProvider';

export interface HabitTemplate {
  key: string;
  name: string;
  hint: string;
  category: string;
  frequencyType: FrequencyType;
  goalType: GoalType;
  targetValue: number | null;
  unitLabel: string | null;
  color: string;
  icon: string;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  { key: 'water', name: 'পানি পান', hint: 'Drink Water', category: 'health', frequencyType: 'daily', goalType: 'quantity', targetValue: 8, unitLabel: 'glasses', color: '#3B82F6', icon: 'water' },
  { key: 'namaz', name: 'নামাজ', hint: 'Prayer 5 times', category: 'mindfulness', frequencyType: 'daily', goalType: 'quantity', targetValue: 5, unitLabel: 'times', color: '#2E7D6B', icon: 'moon' },
  { key: 'study', name: 'পড়াশোনা', hint: '30 min study', category: 'study', frequencyType: 'daily', goalType: 'quantity', targetValue: 30, unitLabel: 'minutes', color: '#8B5CF6', icon: 'book' },
  { key: 'walk', name: 'হাঁটা', hint: 'Morning walk', category: 'health', frequencyType: 'daily', goalType: 'checkbox', targetValue: null, unitLabel: null, color: '#10B981', icon: 'walk' },
  { key: 'book', name: 'বই পড়া', hint: 'Read 20 pages', category: 'study', frequencyType: 'daily', goalType: 'quantity', targetValue: 20, unitLabel: 'pages', color: '#F59E0B', icon: 'book' },
  { key: 'sleep', name: 'তাড়াতাড়ি ঘুম', hint: 'Sleep by 11pm', category: 'health', frequencyType: 'daily', goalType: 'checkbox', targetValue: null, unitLabel: null, color: '#6366F1', icon: 'moon' },
  { key: 'meditation', name: 'মেডিটেশন', hint: '10 min calm', category: 'mindfulness', frequencyType: 'daily', goalType: 'quantity', targetValue: 10, unitLabel: 'minutes', color: '#06B6D4', icon: 'meditation' },
  { key: 'exercise', name: 'ব্যায়াম', hint: 'Workout', category: 'health', frequencyType: 'specific_days', goalType: 'checkbox', targetValue: null, unitLabel: null, color: '#EC4899', icon: 'dumbbell' },
];

export function HabitTemplatePicker({ onPick }: { onPick: (t: HabitTemplate) => void }) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
        {bn ? 'টেমপ্লেট থেকে শুরু করুন' : 'Start from a template'}{' '}
        <span className="text-xs font-normal text-[var(--color-text-secondary)]">
          {bn ? '(এক ক্লিকে ফর্ম ভরে যাবে)' : '(one click fills the form)'}
        </span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {HABIT_TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onPick(t)}
            className="flex items-center gap-2 p-2.5 rounded border border-[var(--color-border)] hover:border-[var(--color-primary)] text-left transition-colors bg-[var(--color-card-bg)]"
            title={t.hint}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: t.color }}
            >
              <HabitIcon iconKey={t.icon} size={16} className="text-white" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold truncate text-[var(--color-text-primary)]">{t.name}</span>
              <span className="block text-[10px] truncate text-[var(--color-text-secondary)]">{t.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
