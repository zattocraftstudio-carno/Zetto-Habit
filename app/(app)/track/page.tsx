import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getHabits } from '@/actions/habits';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HabitIcon, PlusIcon, CalendarIcon } from '@/components/icons';

export default async function TrackOverviewPage() {
  const habitsRes = await getHabits();
  const habits = habitsRes.success ? habitsRes.data : [];

  if (habits.length > 0) {
    redirect(`/track/${habits[0].id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Track Habit
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Detailed calendar logs and history
        </p>
      </div>

      <Card padding="lg" className="text-center py-16 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-4">
          <CalendarIcon size={32} />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          No Habits Found
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">
          Create a habit first to view its calendar view and history logs.
        </p>
        <Link href="/add-habit">
          <Button variant="primary" size="md" className="gap-2">
            <PlusIcon size={20} />
            <span>Create Habit</span>
          </Button>
        </Link>
      </Card>
    </div>
  );
}
