'use server';

import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { getSession } from '@/lib/session';
import { ActionResponse, UserSession } from '@/types';

export async function listSessions(): Promise<ActionResponse<UserSession[]>> {
  return withAuth(async (userId) => {
    const session = await getSession();
    const db = getDbClient();
    const { data, error } = await db
      .from('user_sessions')
      .select('id, user_id, jti, device, created_at, last_seen')
      .eq('user_id', userId)
      .order('last_seen', { ascending: false });
    if (error) throw new Error('Failed to load sessions');
    return ((data || []) as UserSession[]).map((s) => ({
      ...s,
      current: session?.jti ? s.jti === session.jti : false,
    }));
  });
}

export async function revokeSession(sessionId: string): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId) => {
    const session = await getSession();
    const db = getDbClient();
    const { error } = await db.from('user_sessions').delete().eq('id', sessionId).eq('user_id', userId);
    if (error) throw new Error('Failed to revoke session');
    // If user revoked their own current session, drop the cookie too
    if (session?.jti) {
      const { data } = await db.from('user_sessions').select('id').eq('jti', session.jti).maybeSingle();
      if (!data) {
        const { cookies } = await import('next/headers');
        cookies().delete('habit_session');
      }
    }
    return true;
  });
}

export async function revokeAllOtherSessions(): Promise<ActionResponse<number>> {
  return withAuth(async (userId) => {
    const session = await getSession();
    const db = getDbClient();
    let query = db.from('user_sessions').delete({ count: 'exact' }).eq('user_id', userId);
    if (session?.jti) query = query.neq('jti', session.jti);
    const { error, count } = await query;
    if (error) throw new Error('Failed to log out other devices');
    return count ?? 0;
  });
}
