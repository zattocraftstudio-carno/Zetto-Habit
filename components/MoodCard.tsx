'use client';

import React, { useState } from 'react';
import { MoodLog } from '@/types';
import { upsertMood } from '@/actions/mood';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

const MOODS = [
  { v: 1, emoji: '😞', label: 'খারাপ' },
  { v: 2, emoji: '😐', label: 'মোটামুটি' },
  { v: 3, emoji: '🙂', label: 'ভালো' },
  { v: 4, emoji: '😄', label: 'খুব ভালো' },
  { v: 5, emoji: '🤩', label: 'দারুণ' },
];

export function MoodCard({ todayStr, initialMoods }: { todayStr: string; initialMoods: MoodLog[] }) {
  const { toast } = useToast();
  const today = initialMoods.find((m) => m.log_date === todayStr);
  const [mood, setMood] = useState(today?.mood ?? 3);
  const [energy, setEnergy] = useState(today?.energy ?? 3);
  const [saving, setSaving] = useState(false);
  const [week, setWeek] = useState<MoodLog[]>(initialMoods);

  const save = async () => {
    setSaving(true);
    try {
      const res = await upsertMood(todayStr, mood, energy, null);
      if (res.success) {
        toast('Mood saved', 'success');
        setWeek((prev) => {
          const rest = prev.filter((m) => m.log_date !== todayStr);
          return [...rest, res.data].sort((a, b) => a.log_date.localeCompare(b.log_date));
        });
      } else toast(res.error, 'error');
    } catch {
      toast('Failed to save mood', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="md" className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">আজকের মুড ও এনার্জি</h2>
      <div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-1.5">মুড</p>
        <div className="flex gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.v}
              onClick={() => setMood(m.v)}
              title={m.label}
              aria-label={`Mood ${m.v}: ${m.label}`}
              className={`w-9 h-9 rounded-full text-lg transition-all ${
                mood === m.v
                  ? 'bg-[var(--color-primary)]/15 ring-2 ring-[var(--color-primary)] scale-110'
                  : 'bg-[var(--color-missed)]/20 hover:scale-105'
              }`}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-1.5">এনার্জি ⚡ {energy}/5</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((e) => (
            <button
              key={e}
              onClick={() => setEnergy(e)}
              aria-label={`Energy ${e} of 5`}
              className={`flex-1 h-2.5 rounded-full transition-colors ${
                e <= energy ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-missed)]/40'
              }`}
            />
          ))}
        </div>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2 rounded text-xs font-semibold bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 min-h-[36px]"
      >
        {saving ? 'Saving...' : today ? 'আপডেট করুন' : 'সেভ করুন'}
      </button>
      {week.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1" title="Last 7 days mood">
          {week.slice(-7).map((m) => (
            <span key={m.log_date} title={`${m.log_date}: ${m.mood}/5`} className="text-base">
              {MOODS[m.mood - 1]?.emoji || '•'}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
