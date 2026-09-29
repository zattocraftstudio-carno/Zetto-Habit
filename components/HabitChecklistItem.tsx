'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Habit, HabitLog } from '@/types';
import { HabitIcon, CheckIcon, PencilIcon } from '@/components/icons';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { saveLogWithQueue } from '@/lib/offlineQueue';
import { showRpgRewards } from '@/components/rpgRewards';
import { usePrefs } from '@/components/PrefsProvider';
import { useFeedback } from '@/components/FeedbackProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CompletionRipple, nextRippleId } from '@/components/motion/CompletionRipple';
import { MilestoneBurst } from '@/components/motion/MilestoneBurst';
import { claimMilestone, crossedMilestone, tapBounce, tapReverse } from '@/lib/motion';
import { vibrate } from '@/lib/feedback';

interface HabitChecklistItemProps {
  habit: Habit;
  todayLog?: HabitLog | null;
  currentStreak: number;
  todayStr: string;
  onLogUpdated?: () => void;
}

export function HabitChecklistItem({
  habit,
  todayLog,
  currentStreak,
  todayStr,
  onLogUpdated,
}: HabitChecklistItemProps) {
  const { toast } = useToast();
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const { celebrate } = useFeedback();
  const [completedVal, setCompletedVal] = useState<number>(
    todayLog?.completed_value !== null && todayLog?.completed_value !== undefined
      ? Number(todayLog.completed_value)
      : 0
  );
  const [note, setNote] = useState<string>(todayLog?.note || '');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // motion layer
  const reduced = useReducedMotion();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [pulse, setPulse] = useState<'done' | 'reverse' | null>(null);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const streakBefore = useRef(currentStreak);
  const badgeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    streakBefore.current = currentStreak;
  }, [currentStreak]);

  const isQuantity = habit.goal_type === 'quantity';
  const targetVal = habit.target_value ? Number(habit.target_value) : 1;
  const isDone = isQuantity ? completedVal >= targetVal : completedVal >= 1;

  const spawnRipple = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (reduced) return;
      const el = e.currentTarget as HTMLElement;
      const r = el.getBoundingClientRect();
      // Touch events carry the first touch point rather than clientX/clientY
      const point =
        'clientX' in e
          ? { x: e.clientX, y: e.clientY }
          : e.touches[0]
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const id = nextRippleId();
      setRipples((prev) => [
        ...prev.slice(-2),
        { id, x: point.x - r.left, y: point.y - r.top },
      ]);
    // prune after the ripple duration so the list never grows
      setTimeout(() => {
        setRipples((prev) => prev.filter((p) => p.id !== id));
      }, 420);
    },
    [reduced]
  );

  /** Localised burst + haptic when a 7/30/100-day milestone is crossed. */
  const maybeCelebrateMilestone = useCallback(
    (before: number, after: number) => {
      const m = crossedMilestone(before, after);
      if (m === null) return;
      if (!claimMilestone(habit.id, m)) return; // already shown this session
      if (reduced) return;
      const node = badgeRef.current;
      if (node) {
        const r = node.getBoundingClientRect();
        setBurst({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        // distinct from the completion tick: a slightly longer buzz
        vibrate(true);
      }
    },
    [habit.id, reduced]
  );

  const handleToggleCheckbox = async (e: React.MouseEvent) => {
    spawnRipple(e);
    setPulse(isDone ? 'reverse' : 'done');
    setTimeout(() => setPulse(null), isDone ? 160 : 260);
    const prevVal = completedVal;
    const newVal = isDone ? 0 : 1;
    setCompletedVal(newVal);
    try {
      const q = await saveLogWithQueue(habit.id, todayStr, newVal, note);
      if (q.queued) {
        toast('অফলাইনে সেভ হয়েছে — সংযোগ ফিরলে sync হবে', 'info');
        onLogUpdated?.();
        return;
      }
      if (q.success) {
        if (newVal === 1) {
          celebrate();
          // streak advances on the next render; compare against what we had
          maybeCelebrateMilestone(streakBefore.current, currentStreak + 1);
        }
        showRpgRewards(q.rpg, toast, bn);
        if (newVal === 1) {
          toast(`Completed ${habit.name}! Keep up the momentum.`, 'success', {
            action: {
              label: 'Undo',
              onClick: async () => {
                setCompletedVal(prevVal);
                const undo = await saveLogWithQueue(habit.id, todayStr, prevVal, note);
                if (undo.success) {
                  toast('Reverted', 'info');
                  onLogUpdated?.();
                } else {
                  setCompletedVal(newVal);
                  toast(undo.error || 'Failed', 'error');
                }
              },
            },
          });
        }
        onLogUpdated?.();
      } else {
        setCompletedVal(isDone ? 1 : 0);
        toast(q.error || 'Failed', 'error');
      }
    } catch {
      setCompletedVal(isDone ? 1 : 0);
      toast('Failed to record habit', 'error');
    }
  };

  const handleQuantityChange = async (delta: number) => {
    const nextVal = Math.max(0, completedVal + delta);
    if (nextVal === completedVal) return;

    setCompletedVal(nextVal);
    try {
      const q = await saveLogWithQueue(habit.id, todayStr, nextVal, note);
      if (q.queued) {
        toast('অফলাইনে সেভ হয়েছে — সংযোগ ফিরলে sync হবে', 'info');
        onLogUpdated?.();
        return;
      }
      if (q.success) {
        if (nextVal >= targetVal && completedVal < targetVal) celebrate();
        showRpgRewards(q.rpg, toast, bn);
        if (nextVal >= targetVal && completedVal < targetVal) {
          toast(`Target reached for ${habit.name}! 🎉`, 'success');
        }
        onLogUpdated?.();
      } else {
        setCompletedVal(completedVal);
        toast(q.error || 'Failed', 'error');
      }
    } catch {
      setCompletedVal(completedVal);
      toast('Failed to update quantity', 'error');
    }
  };

  const handleSaveNote = async () => {
    setIsSaving(true);
    try {
      const q = await saveLogWithQueue(habit.id, todayStr, completedVal, note);
      if (q.queued) {
        toast('অফলাইনে সেভ হয়েছে — সংযোগ ফিরলে sync হবে', 'info');
        setIsNoteModalOpen(false);
        onLogUpdated?.();
      } else if (q.success) {
        showRpgRewards(q.rpg, toast, bn);
        toast('Note saved for today', 'success');
        setIsNoteModalOpen(false);
        onLogUpdated?.();
      } else {
        toast(q.error || 'Failed', 'error');
      }
    } catch {
      toast('Failed to save note', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <AnimatePresence>
      {burst && (
        <MilestoneBurst active={!!burst} origin={burst} onDone={() => setBurst(null)} />
      )}
    </AnimatePresence>
    <div
      className={`group flex items-center justify-between gap-3 p-4 rounded border transition-all duration-200 ${
        isDone
          ? `bg-[var(--color-card-bg)]/60 border-[var(--color-border)] opacity-85 ${
              !isQuantity ? 'hc-state-done' : ''
            }`
          : `bg-[var(--color-card-bg)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40 shadow-xs hc-state-missed`
      }`}
    >
      {/* Left: Color dot, icon, habit details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs transition-transform group-hover:scale-105"
          style={{ backgroundColor: habit.color || 'var(--color-primary)' }}
        >
          <HabitIcon iconKey={habit.icon_svg} size={20} className="text-white" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/track/${habit.id}`}
              className="text-base font-semibold truncate hover:text-[var(--color-primary)] transition-colors text-[var(--color-text-primary)]"
            >
              {habit.name}
            </Link>
            <span ref={badgeRef} className="inline-flex">
              <StreakBadge streak={currentStreak} />
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-0.5">
            {isQuantity ? (
              <span className="font-medium tabular-nums">
                {completedVal} / {targetVal} {habit.unit_label || 'units'}
              </span>
            ) : (
              <span>{isDone ? 'Completed today' : 'Tap circle to mark done'}</span>
            )}

            {note && (
              <span className="truncate max-w-[140px] italic">
                • &quot;{note}&quot;
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setIsNoteModalOpen(true)}
          className="p-2 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/20"
          title="Add note for today"
          aria-label="Add note"
        >
          <PencilIcon size={16} />
        </button>

        {isQuantity ? (
          <div className="flex items-center gap-1.5 bg-[var(--color-missed)]/20 rounded p-1 border border-[var(--color-border)]">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={completedVal <= 0}
              className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold bg-[var(--color-card-bg)] text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/40 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Decrement"
            >
              -
            </button>
            <span className="text-sm font-semibold px-1.5 tabular-nums min-w-[24px] text-center">
              {completedVal}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold bg-[var(--color-card-bg)] text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/40"
              aria-label="Increment"
            >
              +
            </button>
          </div>
        ) : (
          <div className="relative">
            <motion.button
              onClick={handleToggleCheckbox}
              animate={
                pulse === 'done' ? tapBounce : pulse === 'reverse' ? tapReverse : undefined
              }
              className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors focus-visible:outline-[var(--color-primary)] ${
                isDone
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] text-transparent'
              }`}
              aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
            >
              <CheckIcon size={18} className={isDone ? 'stroke-[2.5]' : 'opacity-0'} />
              {/* ripple radiates from the exact click point */}
              <CompletionRipple ripples={ripples} size={36} />
            </motion.button>
          </div>
        )}
      </div>

      {/* Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title={`Note for ${habit.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Date: <span className="font-semibold text-[var(--color-text-primary)]">{todayStr}</span>
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a thought or note for today..."
            rows={3}
            className="w-full p-3 text-sm rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)] focus-visible:outline-[var(--color-primary)] resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNoteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveNote}
              isLoading={isSaving}
            >
              Save Note
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    </>
  );
}
