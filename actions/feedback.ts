'use server';

import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { ActionResponse } from '@/types';

/** Completion feedback preferences (sound + haptics), stored on `users`. */
export interface FeedbackFlags {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export async function getFeedbackFlags(): Promise<ActionResponse<FeedbackFlags>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db
      .from('users')
      .select('sound_enabled, haptics_enabled')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error('Failed to load feedback settings');
    const u = data as { sound_enabled: boolean; haptics_enabled: boolean } | null;
    return {
      soundEnabled: u?.sound_enabled ?? true,
      hapticsEnabled: u?.haptics_enabled ?? true,
    };
  });
}

export async function setFeedbackFlags(partial: {
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
}): Promise<ActionResponse<FeedbackFlags>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const patch: Record<string, boolean> = {};
    if (typeof partial.soundEnabled === 'boolean') patch.sound_enabled = partial.soundEnabled;
    if (typeof partial.hapticsEnabled === 'boolean') patch.haptics_enabled = partial.hapticsEnabled;
    if (Object.keys(patch).length === 0) throw new Error('Nothing to update');

    const { error } = await db.from('users').update(patch).eq('id', userId);
    if (error) throw new Error('Failed to save feedback settings');

    // Re-read directly rather than nesting another ActionResponse
    const { data } = await db
      .from('users')
      .select('sound_enabled, haptics_enabled')
      .eq('id', userId)
      .maybeSingle();
    const u = data as { sound_enabled: boolean; haptics_enabled: boolean } | null;
    return {
      soundEnabled: u?.sound_enabled ?? true,
      hapticsEnabled: u?.haptics_enabled ?? true,
    };
  });
}
