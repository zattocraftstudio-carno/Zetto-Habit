'use server';

import { z } from 'zod';
import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { UserPreferences, DEFAULT_PREFS, ActionResponse } from '@/types';

const prefsSchema = z.object({
  language: z.enum(['bn', 'en']).optional(),
  theme: z.enum(['light', 'dark', 'system', 'high-contrast']).optional(),
  accent: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .nullable()
    .optional(),
  weekStart: z.union([z.literal(0), z.literal(1), z.literal(6)]).optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  hour12: z.boolean().optional(),
  dayStartHour: z.number().int().min(0).max(5).optional(),
  defaultCategory: z.string().max(30).optional(),
  defaultColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
  defaultFrequency: z.enum(['daily', 'specific_days', 'times_per_week']).optional(),
  graceDaysPerMonth: z.number().int().min(0).max(7).optional(),
  notifications: z
    .object({
      enabled: z.boolean().optional(),
      dailySummaryTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
      quietStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
      quietEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
      streakWarning: z.boolean().optional(),
    })
    .optional(),
  ai: z
    .object({
      proactivity: z.enum(['manual', 'daily_tip', 'weekly_report']).optional(),
      replyLength: z.enum(['short', 'normal', 'detailed']).optional(),
      language: z.enum(['auto', 'bn', 'en']).optional(),
      allowActions: z.boolean().optional(),
    })
    .optional(),
});

function mergePrefs(stored: unknown): UserPreferences {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  return {
    ...DEFAULT_PREFS,
    ...s,
    notifications: { ...DEFAULT_PREFS.notifications, ...((s.notifications as object) || {}) },
    ai: { ...DEFAULT_PREFS.ai, ...((s.ai as object) || {}) },
  };
}

export async function getPreferences(): Promise<ActionResponse<UserPreferences>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db
      .from('user_preferences')
      .select('prefs')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error('Failed to load preferences');
    return mergePrefs(data?.prefs);
  });
}

export async function updatePreferences(
  partial: Partial<UserPreferences>
): Promise<ActionResponse<UserPreferences>> {
  return withAuth(async (userId) => {
    const parsed = prefsSchema.safeParse(partial);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0].message);
    }
    const db = getDbClient();
    const { data: existing } = await db
      .from('user_preferences')
      .select('prefs')
      .eq('user_id', userId)
      .maybeSingle();

    const merged = mergePrefs({ ...(existing?.prefs as object), ...parsed.data });

    const { error } = await db.from('user_preferences').upsert(
      { user_id: userId, prefs: merged, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) throw new Error('Failed to save preferences');
    return merged;
  });
}
