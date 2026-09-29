import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { SessionPayload } from '@/types';
import { getDbClient } from '@/lib/db';

const SESSION_COOKIE_NAME = 'habit_session';
const SESSION_SECRET = process.env.SESSION_JWT_SECRET || 'habit_default_secret_key_change_in_production_12345';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export function signSession(payload: Omit<SessionPayload, 'iat' | 'exp' | 'jti'> & { jti?: string }): string {
  return jwt.sign({ ...payload, jti: payload.jti || randomUUID() }, SESSION_SECRET, {
    expiresIn: SESSION_DURATION,
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: Omit<SessionPayload, 'iat' | 'exp' | 'jti'>): Promise<void> {
  const token = signSession(payload);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION,
  });
}

/** Create a tracked session: signs JWT (with jti), sets cookie, records device row. */
export async function createSession(
  payload: Omit<SessionPayload, 'iat' | 'exp' | 'jti'>,
  device: string | null
): Promise<void> {
  const jti = randomUUID();
  const token = signSession({ ...payload, jti });
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION,
  });
  try {
    const db = getDbClient();
    await db.from('user_sessions').insert({
      user_id: payload.userId,
      jti,
      device: device?.slice(0, 120) || null,
    });
  } catch {
    // Session row is best-effort (older DBs without the table still work)
  }
}

export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const payload = token ? verifySession(token) : null;
    if (payload?.jti) {
      try {
        const db = getDbClient();
        await db.from('user_sessions').delete().eq('jti', payload.jti).eq('user_id', payload.userId);
      } catch {
        // best-effort
      }
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    const cookieStore = cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  // Revocation check: session must still exist in user_sessions (if table exists)
  if (payload.jti) {
    try {
      const db = getDbClient();
      const { data } = await db
        .from('user_sessions')
        .select('id')
        .eq('jti', payload.jti)
        .eq('user_id', payload.userId)
        .maybeSingle();
      if (!data) return null; // logged out from another device
      await db
        .from('user_sessions')
        .update({ last_seen: new Date().toISOString() })
        .eq('jti', payload.jti);
    } catch {
      // Table missing (older DB) — fall back to JWT-only validation
    }
  }
  return payload;
}

export async function getRequiredSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
