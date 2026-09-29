'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { Habit, ActionResponse, FrequencyType, GoalType } from '@/types';

const habitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(100),
  category: z.string().nullable().optional(),
  frequencyType: z.enum(['daily', 'specific_days', 'times_per_week']),
  frequencyDays: z.array(z.number().min(0).max(6)).nullable().optional(),
  frequencyTarget: z.number().int().min(1).max(7).nullable().optional(),
  goalType: z.enum(['checkbox', 'quantity']),
  targetValue: z.number().positive().nullable().optional(),
  unitLabel: z.string().max(30).nullable().optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid hex color required'),
  iconSvg: z.string().nullable().optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Valid time HH:MM required').nullable().optional(),
});

export async function createHabit(formData: {
  name: string;
  category?: string | null;
  frequencyType: FrequencyType;
  frequencyDays?: number[] | null;
  frequencyTarget?: number | null;
  goalType: GoalType;
  targetValue?: number | null;
  unitLabel?: string | null;
  color: string;
  iconSvg?: string | null;
  reminderTime?: string | null;
}): Promise<ActionResponse<Habit>> {
  return withAuth(async (userId) => {
    const parsed = habitSchema.safeParse(formData);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0].message);
    }

    const {
      name,
      category,
      frequencyType,
      frequencyDays,
      frequencyTarget,
      goalType,
      targetValue,
      unitLabel,
      color,
      iconSvg,
      reminderTime,
    } = parsed.data;

    const db = getDbClient();
    const { data, error } = await db.rpc('app_create_habit', {
      p_user_id: userId,
      p_name: name,
      p_category: category || null,
      p_frequency_type: frequencyType,
      p_frequency_days: frequencyType === 'specific_days' ? (frequencyDays || []) : null,
      p_frequency_target: frequencyType === 'times_per_week' ? (frequencyTarget || 1) : null,
      p_goal_type: goalType,
      p_target_value: goalType === 'quantity' ? (targetValue || 1) : null,
      p_unit_label: goalType === 'quantity' ? (unitLabel || '') : null,
      p_color: color,
      p_icon_svg: iconSvg || 'water',
      p_reminder_time: reminderTime || null,
    });

    if (error || !data?.success) {
      throw new Error(data?.error || 'Failed to create habit');
    }

    revalidatePath('/home');
    revalidatePath('/dashboard');
    return data.habit as Habit;
  });
}

export async function updateHabit(
  habitId: string,
  formData: {
    name: string;
    category?: string | null;
    frequencyType: FrequencyType;
    frequencyDays?: number[] | null;
    frequencyTarget?: number | null;
    goalType: GoalType;
    targetValue?: number | null;
    unitLabel?: string | null;
    color: string;
    iconSvg?: string | null;
    reminderTime?: string | null;
  }
): Promise<ActionResponse<Habit>> {
  return withAuth(async (userId) => {
    const parsed = habitSchema.safeParse(formData);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0].message);
    }

    const {
      name,
      category,
      frequencyType,
      frequencyDays,
      frequencyTarget,
      goalType,
      targetValue,
      unitLabel,
      color,
      iconSvg,
      reminderTime,
    } = parsed.data;

    const db = getDbClient();
    const { data, error } = await db.rpc('app_update_habit', {
      p_user_id: userId,
      p_habit_id: habitId,
      p_name: name,
      p_category: category || null,
      p_frequency_type: frequencyType,
      p_frequency_days: frequencyType === 'specific_days' ? (frequencyDays || []) : null,
      p_frequency_target: frequencyType === 'times_per_week' ? (frequencyTarget || 1) : null,
      p_goal_type: goalType,
      p_target_value: goalType === 'quantity' ? (targetValue || 1) : null,
      p_unit_label: goalType === 'quantity' ? (unitLabel || '') : null,
      p_color: color,
      p_icon_svg: iconSvg || 'water',
      p_reminder_time: reminderTime || null,
    });

    if (error || !data?.success) {
      throw new Error(data?.error || 'Failed to update habit');
    }

    revalidatePath('/home');
    revalidatePath('/dashboard');
    revalidatePath(`/track/${habitId}`);
    return data.habit as Habit;
  });
}

export async function archiveHabit(habitId: string): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db.rpc('app_archive_habit', {
      p_user_id: userId,
      p_habit_id: habitId,
    });

    if (error || !data?.success) {
      throw new Error(data?.error || 'Failed to archive habit');
    }

    revalidatePath('/home');
    revalidatePath('/dashboard');
    return true;
  });
}

export async function getHabits(): Promise<ActionResponse<Habit[]>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db.rpc('app_get_habits', {
      p_user_id: userId,
    });

    if (error || !data?.success) {
      throw new Error('Failed to fetch habits');
    }

    return (data.habits || []) as Habit[];
  });
}

export async function getHabit(habitId: string): Promise<ActionResponse<Habit>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db.rpc('app_get_habit_by_id', {
      p_user_id: userId,
      p_habit_id: habitId,
    });

    if (error || !data?.success) {
      throw new Error('Habit not found');
    }

    return data.habit as Habit;
  });
}

export async function setHabitPaused(habitId: string, paused: boolean): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { error } = await db.from('habits').update({ paused }).eq('id', habitId).eq('user_id', userId);
    if (error) throw new Error('Failed to update habit');
    return true;
  });
}

export async function reorderHabits(orderedIds: string[]): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId) => {
    if (orderedIds.length > 200) throw new Error('Too many habits');
    const db = getDbClient();
    // Ownership check: all ids must belong to the user
    const { data: rows, error: fetchError } = await db
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .eq('archived', false);
    if (fetchError) throw new Error('Failed to reorder');
    const owned = new Set((rows || []).map((r) => r.id as string));
    for (const id of orderedIds) {
      if (!owned.has(id)) throw new Error('Invalid habit in order list');
    }
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await db
        .from('habits')
        .update({ sort_order: i })
        .eq('id', orderedIds[i])
        .eq('user_id', userId);
      if (error) throw new Error('Failed to save order');
    }
    return true;
  });
}
