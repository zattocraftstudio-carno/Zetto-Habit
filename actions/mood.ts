'use server';

import { z } from 'zod';
import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { ActionResponse, MoodLog } from '@/types';

const moodSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  note: z.string().max(300).nullable().optional(),
});

export async function upsertMood(
  logDate: string,
  mood: number,
  energy: number,
  note?: string | null
): Promise<ActionResponse<MoodLog>> {
  return withAuth(async (userId) => {
    const parsed = moodSchema.safeParse({ logDate, mood, energy, note: note || null });
    if (!parsed.success) throw new Error(parsed.error.errors[0].message);

    const db = getDbClient();
    const { data, error } = await db
      .from('mood_logs')
      .upsert(
        {
          user_id: userId,
          log_date: parsed.data.logDate,
          mood: parsed.data.mood,
          energy: parsed.data.energy,
          note: parsed.data.note || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,log_date' }
      )
      .select()
      .single();
    if (error) throw new Error('Failed to save mood');
    return data as MoodLog;
  });
}

export async function getMoods(startDate: string, endDate: string): Promise<ActionResponse<MoodLog[]>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });
    if (error) throw new Error('Failed to load mood data');
    return (data || []) as MoodLog[];
  });
}
