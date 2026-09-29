'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createHabit } from '@/actions/habits';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { IconPicker } from '@/components/ui/IconPicker';
import { HabitTemplatePicker, HabitTemplate } from '@/components/HabitTemplates';
import { useToast } from '@/components/ui/Toast';
import { usePrefs } from '@/components/PrefsProvider';
import { FrequencyType, GoalType } from '@/types';

const DAYS_OF_WEEK = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
];

export default function AddHabitPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, lang } = usePrefs();
  const bn = lang === 'bn';

  const [name, setName] = useState('');
  const [category, setCategory] = useState('health');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [frequencyTarget, setFrequencyTarget] = useState(3);
  const [goalType, setGoalType] = useState<GoalType>('checkbox');
  const [targetValue, setTargetValue] = useState<number>(8);
  const [unitLabel, setUnitLabel] = useState('glasses');
  const [color, setColor] = useState('#2E7D6B');
  const [iconSvg, setIconSvg] = useState('water');
  const [reminderTime, setReminderTime] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const applyTemplate = (tpl: HabitTemplate) => {
    setName(tpl.name);
    setCategory(tpl.category);
    setFrequencyType(tpl.frequencyType);
    setGoalType(tpl.goalType);
    if (tpl.targetValue) setTargetValue(tpl.targetValue);
    if (tpl.unitLabel) setUnitLabel(tpl.unitLabel);
    setColor(tpl.color);
    setIconSvg(tpl.icon);
    setError(null);
    toast(`Template "${tpl.name}" applied — review and save`, 'info');
  };

  const toggleDay = (day: number) => {
    if (frequencyDays.includes(day)) {
      if (frequencyDays.length > 1) {
        setFrequencyDays(frequencyDays.filter((d) => d !== day));
      }
    } else {
      setFrequencyDays([...frequencyDays, day].sort());
    }
  };

  const handleReminderPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch {
        // Notification permission handled gracefully
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a habit name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await createHabit({
        name: name.trim(),
        category,
        frequencyType,
        frequencyDays: frequencyType === 'specific_days' ? frequencyDays : null,
        frequencyTarget: frequencyType === 'times_per_week' ? frequencyTarget : null,
        goalType,
        targetValue: goalType === 'quantity' ? targetValue : null,
        unitLabel: goalType === 'quantity' ? unitLabel : null,
        color,
        iconSvg,
        reminderTime: reminderTime || null,
      });

      if (!res.success) {
        setError(res.error);
      } else {
        toast('Habit created successfully! 🌱', 'success');
        router.push('/home');
        router.refresh();
      }
    } catch {
      setError('Failed to create habit');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t('add.title')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {t('add.subtitle')}
        </p>
      </div>

      <Card padding="lg">
        <div className="mb-6 pb-6 border-b border-[var(--color-border)]">
          <HabitTemplatePicker onPick={applyTemplate} />
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3 text-sm rounded bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] font-medium"
            >
              {error}
            </div>
          )}

          {/* Habit Name */}
          <Input
            label={t('add.name')}
            placeholder="e.g. Drink 8 glasses of water"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('add.category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isLoading}
              className="min-h-[44px] px-3.5 py-2 text-base rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)] focus-visible:outline-[var(--color-primary)]"
            >
              <option value="health">Health & Fitness</option>
              <option value="study">Study & Learning</option>
              <option value="productivity">Work & Productivity</option>
              <option value="mindfulness">Mindfulness & Mental Health</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Frequency Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('add.frequency')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(bn
                ? [
                    { type: 'daily', label: 'প্রতিদিন', desc: 'রোজ পুনরাবৃত্তি' },
                    { type: 'specific_days', label: 'নির্দিষ্ট দিন', desc: 'সপ্তাহের দিন বাছুন' },
                    { type: 'times_per_week', label: 'সপ্তাহে কয়বার', desc: 'নমনীয় লক্ষ্য' },
                  ]
                : [
                    { type: 'daily', label: 'Every Day', desc: 'Repeat daily' },
                    { type: 'specific_days', label: 'Specific Days', desc: 'Select weekdays' },
                    { type: 'times_per_week', label: 'Times per Week', desc: 'Flexible target' },
                  ]
              ).map((f) => (
                <button
                  key={f.type}
                  type="button"
                  onClick={() => setFrequencyType(f.type as FrequencyType)}
                  className={`p-3 rounded border text-left transition-all ${
                    frequencyType === f.type
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-missed)]/20 text-[var(--color-text-primary)]'
                  }`}
                >
                  <div className="text-sm font-semibold">{f.label}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>

            {/* Specific Days Selector */}
            {frequencyType === 'specific_days' && (
              <div className="p-3 bg-[var(--color-missed)]/20 rounded border border-[var(--color-border)] mt-2">
                <span className="text-xs font-medium text-[var(--color-text-secondary)] block mb-2">
                  {bn ? 'সক্রিয় দিন বাছুন:' : 'Select active days:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = frequencyDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => toggleDay(d.day)}
                        className={`w-10 h-10 rounded text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Times Per Week Selector */}
            {frequencyType === 'times_per_week' && (
              <div className="p-3 bg-[var(--color-missed)]/20 rounded border border-[var(--color-border)] mt-2 flex items-center gap-3">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {bn ? 'সপ্তাহে লক্ষ্য দিন:' : 'Target days per week:'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={frequencyTarget}
                  onChange={(e) => setFrequencyTarget(Number(e.target.value))}
                  className="w-20 px-2 py-1 text-sm rounded border border-[var(--color-border)] text-center font-bold"
                />
              </div>
            )}
          </div>

          {/* Goal Type (Checkbox vs Quantity) */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('add.goalStyle')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGoalType('checkbox')}
                className={`p-3 rounded border text-left transition-all ${
                  goalType === 'checkbox'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-missed)]/20 text-[var(--color-text-primary)]'
                }`}
              >
                <div className="text-sm font-semibold">{bn ? 'হয়েছে / হয়নি' : 'Done / Not Done'}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{bn ? 'সাধারণ টিক' : 'Simple checkmark'}</div>
              </button>

              <button
                type="button"
                onClick={() => setGoalType('quantity')}
                className={`p-3 rounded border text-left transition-all ${
                  goalType === 'quantity'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-missed)]/20 text-[var(--color-text-primary)]'
                }`}
              >
                <div className="text-sm font-semibold">{bn ? 'পরিমাপযোগ্য' : 'Measurable Amount'}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{bn ? 'যেমন ৮ গ্লাস, ৩০ মিনিট' : 'e.g. 8 glasses, 30 mins'}</div>
              </button>
            </div>

            {goalType === 'quantity' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--color-missed)]/20 rounded border border-[var(--color-border)] mt-2">
                <Input
                  label={t('add.target')}
                  type="number"
                  min={1}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  required
                />
                <Input
                  label={t('add.unit')}
                  placeholder="e.g. glasses, minutes, pages"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Color Picker */}
          <ColorPicker
            label={t('add.color')}
            value={color}
            onChange={(c) => setColor(c)}
          />

          {/* Icon Picker */}
          <IconPicker
            label={t('add.icon')}
            value={iconSvg}
            onChange={(key) => setIconSvg(key)}
          />

          {/* Reminder Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('add.reminder')}
            </label>
            <div className="flex gap-2">
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => {
                  setReminderTime(e.target.value);
                  handleReminderPermission();
                }}
                className="min-h-[44px] px-3.5 py-2 text-base rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)] focus-visible:outline-[var(--color-primary)]"
              />
              {reminderTime && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReminderTime('')}
                >
                  {bn ? 'মুছুন' : 'Clear'}
                </Button>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {bn ? 'ব্রাউজারের স্থানীয় নোটিফিকেশন সময়' : 'Local notification time for your browser'}
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              {t('add.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
            >
              {t('add.create')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
