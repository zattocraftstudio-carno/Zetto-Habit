'use server';

import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { ActionResponse, Habit } from '@/types';
import {
  getProfile,
  ensureQuests,
  openBox,
  buyItem,
  usePotion,
  getLeaderboard,
  claimWeeklyRewards,
  levelForXp,
  BoxResult,
  RpgProfile,
  RPG_LEVELS,
  SHOP_ITEMS,
  ACHIEVEMENTS,
} from '@/lib/rpg';
import { formatDate } from '@/lib/streaks';

export interface RpgQuestRow {
  id: string;
  quest_key: string;
  period: string;
  title: string;
  description: string | null;
  xp_reward: number;
  coin_reward: number;
  box_reward: boolean;
  potion_reward: boolean;
  progress: number;
  target: number;
  status: string;
}

export interface RpgState {
  profile: RpgProfile;
  levelName: string;
  levelNameBn: string;
  levelEmoji: string;
  nextLevelXp: number | null;
  progressPct: number;
  quests: RpgQuestRow[];
  achievements: string[];
  totalAchievements: number;
}

export async function getRpgState(): Promise<ActionResponse<RpgState>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const profile = await getProfile(db, userId);
    const level = levelForXp(profile.xp_total);
    const next = RPG_LEVELS.find((l) => l.level === level.level + 1) || null;

    const { data: habitsRes } = await db.rpc('app_get_habits', { p_user_id: userId });
    const habits = (((habitsRes as { habits?: Habit[] } | null)?.habits || []) as Habit[]);
    const todayStr = formatDate(new Date());
    await ensureQuests(db, userId, habits, todayStr);

    const { data: quests } = await db
      .from('rpg_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('period', todayStr)
      .order('created_at', { ascending: true });
    const { data: ach } = await db.from('rpg_achievements').select('ach_key').eq('user_id', userId);

    const base = level.xpNeeded;
    const span = next ? next.xpNeeded - base : 1;
    return {
      profile,
      levelName: level.name,
      levelNameBn: level.nameBn,
      levelEmoji: level.emoji,
      nextLevelXp: next ? next.xpNeeded : null,
      progressPct: next ? Math.min(100, Math.round(((profile.xp_total - base) / span) * 100)) : 100,
      quests: ((quests || []) as RpgQuestRow[]),
      achievements: ((ach || []) as { ach_key: string }[]).map((a) => a.ach_key),
      totalAchievements: ACHIEVEMENTS.length,
    };
  });
}

export async function openMysteryBox(): Promise<ActionResponse<BoxResult>> {
  return withAuth(async (userId) => {
    return openBox(userId);
  });
}

export async function buyShopItem(key: string): Promise<ActionResponse<string>> {
  return withAuth(async (userId) => {
    return buyItem(userId, key);
  });
}

export async function drinkPotion(): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId) => {
    await usePotion(userId);
    return true;
  });
}

export async function getWeeklyBoard(): Promise<
  ActionResponse<Awaited<ReturnType<typeof getLeaderboard>>>
> {
  return withAuth(async (userId) => {
    return getLeaderboard(userId);
  });
}

export async function claimWeekly(): Promise<ActionResponse<string | null>> {
  return withAuth(async (userId) => {
    return claimWeeklyRewards(userId);
  });
}
