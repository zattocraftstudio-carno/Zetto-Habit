import { getSession } from './session';

export async function withAuth<T>(
  fn: (userId: string, username: string) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }
    const data = await fn(session.userId, session.username);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}
