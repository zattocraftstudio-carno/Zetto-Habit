'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const STEPS = [
  {
    title: 'স্বাগতম! 👋',
    body: 'প্রতিদিন ছোট ছোট habit track করুন। Home পেজে আজকের checklist দেখবেন — টিক দিলেই streak বাড়বে।',
  },
  {
    title: '২. টিক দিন, streak গড়ুন',
    body: 'বৃত্তে চাপ দিলে habit সম্পূর্ণ হয়। আগুনের সংখ্যা = টানা কতদিন ধরে চলছে।',
  },
  {
    title: '৩. Calendar ও Dashboard',
    body: 'Track পেজে পুরো মাসের calendar, Dashboard এ heatmap, গ্রাফ আর ranking দেখুন।',
  },
  {
    title: '৪. AI Coach আছে পাশে',
    body: 'নিচের 🤖 button এ habit বানানো, track করা, রিপোর্ট — সব চাইতে পারেন। শুরু করতে একটা template বেছে নিন!',
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem('habit_onboarded')) setOpen(true);
    } catch {
      // ignore
    }
  }, []);

  const finish = () => {
    try {
      localStorage.setItem('habit_onboarded', '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={finish} title={`Guide (${step + 1}/${STEPS.length})`}>
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{STEPS[step].title}</h3>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{STEPS[step].body}</p>
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={finish}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="primary" size="sm" onClick={() => setStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Link href="/add-habit">
                <Button variant="primary" size="sm" onClick={finish}>
                  প্রথম Habit বানান
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
