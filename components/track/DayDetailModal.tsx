'use client';

import React, { useState, useEffect } from 'react';
import { Habit, HabitLog } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { usePrefs } from '@/components/PrefsProvider';
import { useFeedback } from '@/components/FeedbackProvider';
import { saveLogWithQueue } from '@/lib/offlineQueue';
import { showRpgRewards } from '@/components/rpgRewards';
import { isLogCompleted, formatDate, parseDate } from '@/lib/streaks';
import { upsertMood } from '@/actions/mood';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@/components/icons';

const MOODS = [
  { v: 1, emoji: '😞' },
  { v: 2, emoji: '😐' },
  { v: 3, emoji: '🙂' },
  { v: 4, emoji: '😄' },
  { v: 5, emoji: '🤩' },
];

export function DayDetailModal({
  habit,
  date,
  log,
  mood,
  onClose,
  onNavigate,
  onSaved,
}: {
  habit: Habit;
  date: string;
  log?: HabitLog | null;
  mood?: { mood: number; energy: number } | null;
  onClose: () => void;
  onNavigate: (nextDate: string) => void;
  onSaved: () => void;
}) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const { toast } = useToast();
  const { celebrate } = useFeedback();
  const isQuantity = habit.goal_type === 'quantity';
  const target = Number(habit.target_value || 1);

  const [value, setValue] = useState<number>(
    log?.completed_value !== null && log?.completed_value !== undefined
      ? Number(log.completed_value)
      : isQuantity
        ? 0
        : 0
  );
  const [note, setNote] = useState<string>(log?.note || '');
  const [saving, setSaving] = useState(false);
  const [moodVal, setMoodVal] = useState<number | null>(mood?.mood ?? null);

  useEffect(() => {
    setValue(
      log?.completed_value !== null && log?.completed_value !== undefined
        ? Number(log.completed_value)
        : 0
    );
    setNote(log?.note || '');
    setMoodVal(mood?.mood ?? null);
  }, [date, log, mood]);

  const done = isQuantity ? value >= target : value >= 1;
  const isToday = date === formatDate(new Date());
  const canNavNext = date < formatDate(new Date());

  const save = async () => {
    setSaving(true);
    try {
      const q = await saveLogWithQueue(habit.id, date, value, note || null);
      if (q.queued) {
        toast(bn ? 'অফলাইনে সেভ হয়েছে' : 'Saved offline', 'info');
      } else if (q.success) {
        // fire feedback only when this save actually completed the habit
        const completes = isQuantity ? value >= target : value >= 1;
        if (completes) celebrate();
        showRpgRewards(q.rpg, toast, bn);
        toast(bn ? 'সেভ হয়েছে' : 'Saved', 'success');
      } else {
        toast(q.error || 'Failed', 'error');
      }
      onSaved();
    } catch {
      toast(bn ? 'সেভ ব্যর্থ' : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveMood = async (m: number) => {
    setMoodVal(m);
    const res = await upsertMood(date, m, mood?.energy ?? 3, null);
    if (!res.success) toast(res.error, 'error');
  };

  return (
    <Modal isOpen onClose={onClose} title={`${date}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const d = parseDate(date);
              d.setDate(d.getDate() - 1);
              onNavigate(formatDate(d));
            }}
            className="gap-1"
          >
            <ChevronLeftIcon size={16} />
            <span className="text-xs">{bn ? 'আগের' : 'Prev'}</span>
          </Button>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {isToday ? (bn ? 'আজ' : 'Today') : done ? (bn ? 'সম্পূর্ণ' : 'Completed') : bn ? 'মিস' : 'Missed'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const d = parseDate(date);
              d.setDate(d.getDate() + 1);
              onNavigate(formatDate(d));
            }}
            disabled={!canNavNext}
            className="gap-1"
          >
            <span className="text-xs">{bn ? 'পরের' : 'Next'}</span>
            <ChevronRightIcon size={16} />
          </Button>
        </div>

        {/* Status toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-missed)]/15">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {bn ? 'স্ট্যাটাস' : 'Status'}
          </span>
          <Button
            variant={done ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setValue(done ? 0 : isQuantity ? target : 1)}
            className="gap-1.5"
          >
            {done ? <CheckIcon size={16} /> : null}
            {done ? (bn ? 'সম্পূর্ণ' : 'Completed') : bn ? 'সম্পূর্ণ নয়' : 'Not done'}
          </Button>
        </div>

        {/* Quantity stepper */}
        {isQuantity && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {bn ? 'পরিমাণ' : 'Amount'}
              <span className="ml-1.5 text-xs text-[var(--color-text-secondary)]">
                ({value}/{target} {habit.unit_label || ''})
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setValue(Math.max(0, value - 1))}
                className="w-9 h-9 rounded-lg border border-[var(--color-border)] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/30"
                aria-label={bn ? 'কমান' : 'Decrease'}
              >
                −
              </button>
              <span className="w-8 text-center font-bold tabular-nums">{value}</span>
              <button
                onClick={() => setValue(value + 1)}
                className="w-9 h-9 rounded-lg border border-[var(--color-border)] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/30"
                aria-label={bn ? 'বাড়ান' : 'Increase'}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Note */}
        <Input
          label={bn ? 'নোট' : 'Note'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={bn ? 'ঐ দিনের নোট...' : 'Note for this day...'}
        />

        {/* Mood for that day */}
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {bn ? 'ঐ দিনের mood' : 'Mood that day'}
          </p>
          <div className="flex gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.v}
                onClick={() => saveMood(m.v)}
                className={`w-10 h-10 rounded-full text-lg transition-all ${
                  moodVal === m.v
                    ? 'bg-[var(--color-primary)]/15 ring-2 ring-[var(--color-primary)] scale-110'
                    : 'bg-[var(--color-missed)]/20 hover:scale-105'
                }`}
                aria-label={`Mood ${m.v}`}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            {bn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button variant="primary" size="sm" onClick={save} isLoading={saving}>
            {bn ? 'সেভ করুন' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { isLogCompleted };
