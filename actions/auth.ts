'use server';

import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { getDbClient } from '@/lib/db';
import { hashPassword, verifyPassword, hashBirthDate, verifyBirthDate } from '@/lib/hash';
import { headers } from 'next/headers';
import { createSession, clearSessionCookie } from '@/lib/session';

function deviceLabel(): string | null {
  try {
    const ua = headers().get('user-agent');
    if (!ua) return null;
    // Compact device label: browser/OS hint (first token groups)
    const m = ua.match(/(Firefox|Chrome|Safari|Edg|OPR)[/\s][\d.]+/);
    const os = ua.match(/(Windows|Android|iPhone|iPad|Mac OS X|Linux)[^;)]*/);
    return `${os ? os[0] : 'Device'}${m ? ` · ${m[0]}` : ''}`.slice(0, 120);
  } catch {
    return null;
  }
}
import { ActionResponse } from '@/types';

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please provide a valid date in YYYY-MM-DD format'),
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const resetRateLimitMap = new Map<string, { attempts: number; firstAttempt: number }>();
const RESET_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_RESET_ATTEMPTS = 5;

const RESET_TOKEN_SECRET = process.env.SESSION_JWT_SECRET || 'reset_token_secret_key_12345';

export async function signup(formData: {
  username: string;
  password: string;
  birthDate: string;
}): Promise<ActionResponse<{ username: string }>> {
  try {
    const parsed = signupSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const { username, password, birthDate } = parsed.data;

    const passwordHash = await hashPassword(password);
    const birthDateHash = await hashBirthDate(birthDate);

    const db = getDbClient();
    const { data, error } = await db.rpc('app_create_user', {
      p_username: username,
      p_password_hash: passwordHash,
      p_birth_date_hash: birthDateHash,
    });

    if (error) {
      return { success: false, error: 'Failed to create user account' };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Username is already taken' };
    }

    const user = data.user;
    await createSession(
      {
        userId: user.id,
        username: user.username,
      },
      deviceLabel()
    );

    return { success: true, data: { username: user.username } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signup failed';
    return { success: false, error: msg };
  }
}

export async function login(formData: {
  username: string;
  password: string;
}): Promise<ActionResponse<{ username: string }>> {
  try {
    const parsed = loginSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    const { username, password } = parsed.data;
    const db = getDbClient();

    const { data, error } = await db.rpc('app_get_user_by_username', {
      p_username: username,
    });

    // Constant time generic response to avoid enumeration
    if (error || !data || !data.found) {
      // Fake bcrypt comparison to reduce timing attack difference
      await verifyPassword('dummy_pass', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUU123456');
      return { success: false, error: 'Invalid username or password' };
    }

    const user = data.user;
    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return { success: false, error: 'Invalid username or password' };
    }

    await createSession(
      {
        userId: user.id,
        username: user.username,
      },
      deviceLabel()
    );

    return { success: true, data: { username: user.username } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    return { success: false, error: msg };
  }
}

export async function logout(): Promise<ActionResponse<boolean>> {
  try {
    await clearSessionCookie();
    return { success: true, data: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Logout failed';
    return { success: false, error: msg };
  }
}

export async function requestReset(username: string): Promise<ActionResponse<{ username: string }>> {
  // Always return success shape without revealing existence
  const trimmed = username.trim();
  return { success: true, data: { username: trimmed } };
}

export async function verifyResetBirthDate(
  username: string,
  birthDate: string
): Promise<ActionResponse<{ resetToken: string }>> {
  try {
    const normUser = username.trim().toLowerCase();
    const now = Date.now();

    // Check rate limit
    const rateData = resetRateLimitMap.get(normUser);
    if (rateData) {
      if (now - rateData.firstAttempt < RESET_RATE_LIMIT_WINDOW) {
        if (rateData.attempts >= MAX_RESET_ATTEMPTS) {
          return {
            success: false,
            error: 'Too many reset attempts. Please try again after 1 hour.',
          };
        }
        rateData.attempts++;
      } else {
        resetRateLimitMap.set(normUser, { attempts: 1, firstAttempt: now });
      }
    } else {
      resetRateLimitMap.set(normUser, { attempts: 1, firstAttempt: now });
    }

    const db = getDbClient();
    const { data } = await db.rpc('app_get_user_by_username', {
      p_username: normUser,
    });

    if (!data || !data.found) {
      // Dummy check to mitigate timing leak
      await verifyBirthDate('2000-01-01', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUU123456');
      return {
        success: false,
        error: "The information provided doesn't match our records",
      };
    }

    const user = data.user;
    const isBirthMatch = await verifyBirthDate(birthDate, user.birth_date_hash);
    if (!isBirthMatch) {
      return {
        success: false,
        error: "The information provided doesn't match our records",
      };
    }

    // Success: issue short-lived reset token (10 min expiry)
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      RESET_TOKEN_SECRET,
      { expiresIn: '10m' }
    );

    // Reset rate limit on success
    resetRateLimitMap.delete(normUser);

    return { success: true, data: { resetToken } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return { success: false, error: msg };
  }
}

export async function submitNewPassword(
  resetToken: string,
  newPassword: string
): Promise<ActionResponse<boolean>> {
  try {
    if (newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    let payload: { userId: string; purpose: string };
    try {
      payload = jwt.verify(resetToken, RESET_TOKEN_SECRET) as {
        userId: string;
        purpose: string;
      };
    } catch {
      return { success: false, error: 'Reset link has expired or is invalid. Please start over.' };
    }

    if (payload.purpose !== 'password_reset' || !payload.userId) {
      return { success: false, error: 'Invalid reset token' };
    }

    const newHash = await hashPassword(newPassword);
    const db = getDbClient();
    const { data, error } = await db.rpc('app_update_password', {
      p_user_id: payload.userId,
      p_new_password_hash: newHash,
    });

    if (error || !data?.success) {
      return { success: false, error: 'Failed to update password' };
    }

    return { success: true, data: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update password';
    return { success: false, error: msg };
  }
}
