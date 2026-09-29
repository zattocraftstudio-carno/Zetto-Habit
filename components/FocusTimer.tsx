'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const PRESETS = [15, 25, 30, 60];

export function FocusTimer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSecondsLeft(minutes * 60);
    setRunning(false);
  }, [minutes, isOpen]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            setRunning(false);
            toast('Focus session complete! Great work.', 'success');
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, toast]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = 1 - secondsLeft / (minutes * 60);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Focus Timer">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setMinutes(p)}
              className={`px-3 py-1.5 rounded text-xs font-semibold ${
                minutes === p
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}
            >
              {p}m
            </button>
          ))}
        </div>
        <div className="text-5xl font-bold tabular-nums tracking-tight text-[var(--color-text-primary)]">
          {mm}:{ss}
        </div>
        <div className="w-full h-2 rounded bg-[var(--color-missed)]/40 overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-1000"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => setRunning(!running)}>
            {running ? 'Pause' : secondsLeft < minutes * 60 && secondsLeft > 0 ? 'Resume' : 'Start'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(minutes * 60);
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </Modal>
  );
}
