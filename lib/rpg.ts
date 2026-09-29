import 'server-only';
import { SupabaseClient } from '@supabase/supabase-js';
import { getDbClient } from '@/lib/db';
import {
  formatDate,
  parseDate,
  isLogCompleted,
  computeCurrentStreak,
  computeLongestStreak,
} from '@/lib/streaks';
import { Habit, HabitLog } from '@/types';

// ---------------------------------------------------------------------------
// RPG constants — single source of truth for the whole game loop
// ---------------------------------------------------------------------------

export interface RpgLevel {
  level: number;
  name: string;
  nameBn: string;
  emoji: string;
  xpNeeded: number;
  accent: string;
}

export const RPG_LEVELS: RpgLevel[] = [
  { level: 1, name: 'Beginner', nameBn: 'বিগিনার', emoji: '🌱', xpNeeded: 0, accent: '#2E7D6B' },
  { level: 2, name: 'Explorer', nameBn: 'এক্সপ্লোরার', emoji: '🧭', xpNeeded: 200, accent: '#0E7D8A' },
  { level: 3, name: 'Warrior', nameBn: 'যোদ্ধা', emoji: '⚔️', xpNeeded: 500, accent: '#C4554D' },
  { level: 4, name: 'Master', nameBn: 'মাস্টার', emoji: '🔥', xpNeeded: 1000, accent: '#8B5CF6' },
  { level: 5, name: 'Legend', nameBn: 'লেজেন্ড', emoji: '👑', xpNeeded: 2000, accent: '#B8860B' },
];

export function levelForXp(xp: number): RpgLevel {
  let cur = RPG_LEVELS[0];
  for (const l of RPG_LEVELS) {
    if (xp >= l.xpNeeded) cur = l;
  }
  return cur;
}

export const XP_PER_COMPLETE = 20;
export const COINS_PER_COMPLETE = 5;
export const ALL_DAILY_BONUS_XP = 50;
export const ALL_DAILY_BONUS_COINS = 25;

export interface ShopItem {
  key: string;
  name: string;
  nameBn: string;
  desc: string;
  descBn: string;
  price: number;
  emoji: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { key: 'shield', name: 'Streak Shield', nameBn: 'স্ট্রিক শিল্ড', desc: '+1 streak protection (passive)', descBn: '+১ স্ট্রিক সুরক্ষা', price: 100, emoji: '🛡️' },
  { key: 'potion', name: 'XP Potion', nameBn: 'XP পোশন', desc: '2× XP for 1 hour', descBn: '১ ঘণ্টা ২× XP', price: 80, emoji: '🧪' },
  { key: 'multiplier', name: 'XP Multiplier', nameBn: 'XP মাল্টিপ্লায়ার', desc: '1.5× XP until midnight', descBn: 'আজ রাত পর্যন্ত ১.৫× XP', price: 120, emoji: '⚡' },
  { key: 'box', name: 'Mystery Box', nameBn: 'মিস্ট্রি বক্স', desc: 'Random reward inside', descBn: 'ভেতরে random পুরস্কার', price: 150, emoji: '🎁' },
  { key: 'random', name: 'Random Reward', nameBn: 'র‍্যান্ডম পুরস্কার', desc: 'Instant 10–40 coins', descBn: 'সাথে সাথে ১০–৪০ কয়েন', price: 50, emoji: '🎲' },
];

export interface AchievementDef {
  key: string;
  name: string;
  nameBn: string;
  desc: string;
  xp: number;
  coins: number;
  box?: boolean;
  shield?: boolean;
  hidden?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_step', name: 'First Step', nameBn: 'প্রথম পদক্ষেপ', desc: 'Complete your first habit', xp: 20, coins: 10 },
  { key: 'streak_3', name: 'Getting Started', nameBn: 'শুরু হলো', desc: '3-day streak', xp: 30, coins: 15 },
  { key: 'on_fire_7', name: 'On Fire', nameBn: 'আগুন', desc: '7-day streak', xp: 50, coins: 30 },
  { key: 'centurion_100', name: 'Centurion', nameBn: 'সেঞ্চুরিয়ান', desc: 'Complete 100 habits', xp: 100, coins: 50 },
  { key: 'perfect_7', name: 'Perfect Week', nameBn: 'পারফেক্ট সপ্তাহ', desc: '7 perfect days total', xp: 100, coins: 50, box: true },
  { key: 'consistency_30', name: 'Consistency King', nameBn: 'ধারাবাহিকতার রাজা', desc: '30-day streak', xp: 150, coins: 80, shield: true },
  { key: 'bookworm_50', name: 'Bookworm', nameBn: 'বইপোকা', desc: '50 reading sessions', xp: 80, coins: 40 },
  { key: 'fitness_50', name: 'Fitness Warrior', nameBn: 'ফিটনেস যোদ্ধা', desc: '50 exercise sessions', xp: 80, coins: 40 },
  { key: 'hydration_50', name: 'Hydration Hero', nameBn: 'পানি-হিরো', desc: '50 water goals', xp: 80, coins: 40 },
  { key: 'zen_50', name: 'Zen Master', nameBn: 'জেন মাস্টার', desc: '50 mindfulness sessions', xp: 80, coins: 40 },
  { key: 'quest_100', name: 'Quest Master', nameBn: 'কোয়েস্ট মাস্টার', desc: 'Complete 100 quests', xp: 120, coins: 60 },
  { key: 'lucky_25', name: 'Lucky One', nameBn: 'ভাগ্যবান', desc: 'Open 25 mystery boxes', xp: 100, coins: 50 },
  { key: 'coin_1000', name: 'Coin Collector', nameBn: 'কয়েন সংগ্রাহক', desc: 'Earn 1000 coins total', xp: 60, coins: 0 },
  { key: 'night_owl', name: 'Night Owl', nameBn: 'রাতজাগা পাখি', desc: 'Log after midnight', xp: 25, coins: 15, hidden: true },
  { key: 'early_bird', name: 'Early Bird', nameBn: 'ভোরের পাখি', desc: 'Complete before 7 AM', xp: 25, coins: 15, hidden: true },
  { key: 'comeback', name: 'Comeback Kid', nameBn: 'ফিরে আসা', desc: 'Log again after a broken streak', xp: 30, coins: 15, hidden: true },
];

export interface RpgProfile {
  user_id: string;
  xp_total: number;
  coins_total: number;
  coins_earned: number;
  level: number;
  streak_shields: number;
  xp_potions: number;
  xp_boost_until: string | null;
  xp_multiplier_until: string | null;
  mystery_boxes: number;
  boxes_opened: number;
  quests_completed: number;
  last_reward_week: string | null;
}

export interface RpgRewardInfo {
  xp: number;
  coins: number;
  leveledUp: boolean;
  newLevel: RpgLevel | null;
  questsDone: string[];
  achievements: string[];
  boxesEarned: number;
}

// ---------------------------------------------------------------------------
// Profile helpers
// ---------------------------------------------------------------------------

export async function getProfile(db: SupabaseClient, userId: string): Promise<RpgProfile> {
  const { data } = await db.from('rpg_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (data) return data as RpgProfile;
  const fresh: RpgProfile = {
    user_id: userId,
    xp_total: 0,
    coins_total: 0,
    coins_earned: 0,
    level: 1,
    streak_shields: 0,
    xp_potions: 0,
    xp_boost_until: null,
    xp_multiplier_until: null,
    mystery_boxes: 0,
    boxes_opened: 0,
    quests_completed: 0,
    last_reward_week: null,
  };
  await db.from('rpg_profiles').insert({ user_id: userId });
  return fresh;
}

async function saveProfile(db: SupabaseClient, p: RpgProfile) {
  await db
    .from('rpg_profiles')
    .update({
      xp_total: p.xp_total,
      coins_total: p.coins_total,
      coins_earned: p.coins_earned,
      level: p.level,
      streak_shields: p.streak_shields,
      xp_potions: p.xp_potions,
      xp_boost_until: p.xp_boost_until,
      xp_multiplier_until: p.xp_multiplier_until,
      mystery_boxes: p.mystery_boxes,
      boxes_opened: p.boxes_opened,
      quests_completed: p.quests_completed,
      last_reward_week: p.last_reward_week,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', p.user_id);
}

function weekKey(d: Date): string {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Monday start
  copy.setDate(copy.getDate() - day);
  return formatDate(copy);
}

function xpMultiplierNow(p: RpgProfile): number {
  const now = new Date().toISOString();
  if (p.xp_boost_until && p.xp_boost_until > now) return 2;
  if (p.xp_multiplier_until && p.xp_multiplier_until > now) return 1.5;
  return 1;
}

// ---------------------------------------------------------------------------
// Daily / weekly quest generation
// ---------------------------------------------------------------------------

export async function ensureQuests(db: SupabaseClient, userId: string, habits: Habit[], todayStr: string) {
  const period = todayStr;
  const { data: existing } = await db
    .from('rpg_quests')
    .select('quest_key')
    .eq('user_id', userId)
    .eq('period', period);
  const have = new Set(((existing || []) as { quest_key: string }[]).map((r) => r.quest_key));
  const rows: Record<string, unknown>[] = [];

  // Dynamic habit quests (up to 3 due habits)
  const due = habits.filter((h) => !h.archived && !h.paused).slice(0, 3);
  for (const h of due) {
    const key = `habit_${h.id}`;
    if (!have.has(key)) {
      rows.push({
        user_id: userId,
        quest_key: key,
        period,
        title: h.name,
        description: `Complete "${h.name}" today`,
        xp_reward: 20,
        coin_reward: 10,
        target: 1,
      });
    }
  }
  if (!have.has('daily_3') && due.length >= 3) {
    rows.push({
      user_id: userId,
      quest_key: 'daily_3',
      period,
      title: 'Three in a Row',
      description: 'Complete 3 habits today',
      xp_reward: 50,
      coin_reward: 20,
      target: 3,
    });
  }
  if (!have.has('daily_all') && due.length > 0) {
    rows.push({
      user_id: userId,
      quest_key: 'daily_all',
      period,
      title: 'Daily Champion',
      description: 'Complete every planned habit today',
      xp_reward: 100,
      coin_reward: 50,
      target: due.length,
    });
  }
  // Random bonus challenge: a random habit as bonus quest
  if (!have.has('random_bonus') && due.length > 0) {
    const pick = due[Math.floor(Math.random() * due.length)];
    rows.push({
      user_id: userId,
      quest_key: 'random_bonus',
      period,
      title: `🎲 Bonus: ${pick.name}`,
      description: `Extra challenge — complete "${pick.name}" today`,
      xp_reward: 50,
      coin_reward: 0,
      target: 1,
    });
  }
  // Weekly quests (Monday period)
  const wk = weekKey(new Date());
  const { data: wExisting } = await db
    .from('rpg_quests')
    .select('quest_key')
    .eq('user_id', userId)
    .eq('period', wk);
  const wHave = new Set(((wExisting || []) as { quest_key: string }[]).map((r) => r.quest_key));
  if (!wHave.has('weekly_10')) {
    rows.push({
      user_id: userId,
      quest_key: 'weekly_10',
      period: wk,
      title: 'Weekly Warrior',
      description: 'Complete 10 habits this week',
      xp_reward: 80,
      coin_reward: 40,
      target: 10,
    });
  }
  if (!wHave.has('weekly_perfect')) {
    rows.push({
      user_id: userId,
      quest_key: 'weekly_perfect',
      period: wk,
      title: 'Perfect Days',
      description: '2 perfect days this week',
      xp_reward: 100,
      coin_reward: 50,
      box_reward: true,
      target: 2,
    });
  }
  for (const r of rows) {
    await db.from('rpg_quests').upsert(r, { onConflict: 'user_id,quest_key,period', ignoreDuplicates: true });
  }
}

// ---------------------------------------------------------------------------
// Main reward hook — call after a COMPLETED log is saved
// ---------------------------------------------------------------------------

export async function processLogReward(
  userId: string,
  habit: Habit,
  logDate: string,
  allHabits: Habit[],
  dayLogs: HabitLog[]
): Promise<RpgRewardInfo> {
  const db = getDbClient();
  const info: RpgRewardInfo = {
    xp: 0,
    coins: 0,
    leveledUp: false,
    newLevel: null,
    questsDone: [],
    achievements: [],
    boxesEarned: 0,
  };

  const profile = await getProfile(db, userId);
  const oldLevel = levelForXp(profile.xp_total);
  const mult = xpMultiplierNow(profile);

  const grant = (xp: number, coins: number, source: string) => {
    const gx = Math.round(xp * mult);
    profile.xp_total += gx;
    profile.coins_total += coins;
    profile.coins_earned += coins;
    info.xp += gx;
    info.coins += coins;
    void db.from('rpg_xp_events').insert({ user_id: userId, log_date: logDate, xp: gx, coins, source });
  };

  // Base habit reward
  grant(XP_PER_COMPLETE, COINS_PER_COMPLETE, 'habit');

  // All-daily bonus (once per day)
  const dueToday = allHabits.filter((h) => {
    if (h.archived || h.paused) return false;
    if (h.frequency_type === 'daily') return true;
    if (h.frequency_type === 'specific_days' && h.frequency_days) {
      return h.frequency_days.includes(parseDate(logDate).getDay());
    }
    return true;
  });
  const allDone =
    dueToday.length > 0 &&
    dueToday.every((h) => {
      const l = dayLogs.find((x) => x.habit_id === h.id && x.log_date === logDate);
      return l && isLogCompleted(h, l);
    });
  if (allDone) {
    const { data: bonus } = await db
      .from('rpg_xp_events')
      .select('id')
      .eq('user_id', userId)
      .eq('log_date', logDate)
      .eq('source', 'allbonus')
      .limit(1);
    if (!bonus || bonus.length === 0) {
      grant(ALL_DAILY_BONUS_XP, ALL_DAILY_BONUS_COINS, 'allbonus');
    }
  }

  // Quest progress
  await ensureQuests(db, userId, allHabits, formatDate(new Date()));
  const { data: quests } = await db
    .from('rpg_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');
  const completeQuest = async (q: { id: string; title: string; xp_reward: number; coin_reward: number; box_reward: boolean; potion_reward: boolean }) => {
    await db.from('rpg_quests').update({ status: 'done', progress: 1, completed_at: new Date().toISOString() }).eq('id', q.id);
    profile.quests_completed += 1;
    grant(q.xp_reward, q.coin_reward, 'quest');
    if (q.box_reward) {
      profile.mystery_boxes += 1;
      info.boxesEarned += 1;
    }
    if (q.potion_reward) profile.xp_potions += 1;
    info.questsDone.push(q.title);
  };

  const todayStr = formatDate(new Date());
  const todayLogs = dayLogs.filter((l) => l.log_date === logDate);
  const doneTodayIds = new Set(
    allHabits.filter((h) => {
      const l = todayLogs.find((x) => x.habit_id === h.id);
      return l && isLogCompleted(h, l);
    }).map((h) => h.id)
  );

  for (const q of (quests || []) as {
    id: string; quest_key: string; period: string; title: string;
    xp_reward: number; coin_reward: number; box_reward: boolean; potion_reward: boolean;
    progress: number; target: number;
  }[]) {
    if (q.quest_key.startsWith('habit_') && q.period === todayStr && logDate === todayStr) {
      const hid = q.quest_key.slice('habit_'.length);
      if (doneTodayIds.has(hid)) await completeQuest(q);
    } else if (q.quest_key === 'random_bonus' && q.period === todayStr && logDate === todayStr) {
      if (doneTodayIds.size > 0) await completeQuest(q);
    } else if (q.quest_key === 'daily_3' && q.period === todayStr && logDate === todayStr) {
      if (doneTodayIds.size >= 3) await completeQuest(q);
      else await db.from('rpg_quests').update({ progress: doneTodayIds.size }).eq('id', q.id);
    } else if (q.quest_key === 'daily_all' && q.period === todayStr && allDone && logDate === todayStr) {
      await completeQuest(q);
    } else if (q.quest_key === 'weekly_10') {
      const { count } = await db
        .from('rpg_xp_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source', 'habit')
        .gte('log_date', q.period);
      const c = count ?? 0;
      if (c >= 10) await completeQuest(q);
      else await db.from('rpg_quests').update({ progress: Math.min(c, 10) }).eq('id', q.id);
    } else if (q.quest_key === 'weekly_perfect') {
      const { data: bonuses } = await db
        .from('rpg_xp_events')
        .select('log_date')
        .eq('user_id', userId)
        .eq('source', 'allbonus')
        .gte('log_date', q.period);
      const c = bonuses?.length ?? 0;
      if (c >= 2) await completeQuest(q);
      else await db.from('rpg_quests').update({ progress: Math.min(c, 2) }).eq('id', q.id);
    }
  }

  // Achievements
  const newAch = await checkAchievements(db, userId, habit, allHabits, profile);
  for (const a of newAch) {
    grant(a.xp, a.coins, 'achievement');
    if (a.box) {
      profile.mystery_boxes += 1;
      info.boxesEarned += 1;
    }
    if (a.shield) profile.streak_shields += 1;
    info.achievements.push(a.nameBn);
  }

  // Level-up?
  const newLevel = levelForXp(profile.xp_total);
  if (newLevel.level > oldLevel.level) {
    profile.level = newLevel.level;
    profile.mystery_boxes += 1; // level-up gift
    info.boxesEarned += 1;
    info.leveledUp = true;
    info.newLevel = newLevel;
  }

  await saveProfile(db, profile);
  return info;
}

async function checkAchievements(
  db: SupabaseClient,
  userId: string,
  habit: Habit,
  allHabits: Habit[],
  profile: RpgProfile
): Promise<AchievementDef[]> {
  const { data: have } = await db.from('rpg_achievements').select('ach_key').eq('user_id', userId);
  const owned = new Set(((have || []) as { ach_key: string }[]).map((r) => r.ach_key));
  const out: AchievementDef[] = [];
  const unlock = async (key: string) => {
    const def = ACHIEVEMENTS.find((a) => a.key === key)!;
    await db.from('rpg_achievements').insert({ user_id: userId, ach_key: key });
    out.push(def);
  };

  // Totals (last 180 days window is plenty for counts)
  const ago = new Date();
  ago.setDate(ago.getDate() - 180);
  const { data: logsRes } = await db.rpc('app_get_habit_logs_for_range', {
    p_user_id: userId,
    p_start_date: formatDate(ago),
    p_end_date: formatDate(new Date()),
  });
  const logs = ((logsRes as { data?: { logs?: HabitLog[] } })?.data?.logs || []) as HabitLog[];
  const byId = new Map(allHabits.map((h) => [h.id, h]));
  const done = logs.filter((l) => {
    const h = byId.get(l.habit_id);
    return h && isLogCompleted(h, l);
  });
  const catCount = (match: (h: Habit) => boolean) =>
    done.filter((l) => {
      const h = byId.get(l.habit_id);
      return h && match(h);
    }).length;

  const isWater = (h: Habit) => /water|পানি|glass/i.test(`${h.name} ${h.unit_label || ''}`);
  const isRead = (h: Habit) => h.category === 'study' || /read|book|পড়|বই/i.test(h.name);
  const isFit = (h: Habit) => h.category === 'health' && /exer|workout|walk|run|gym|ব্যায়াম|হাঁট/i.test(h.name);
  const isZen = (h: Habit) => h.category === 'mindfulness' || /meditat|নামাজ|মেডিটেশন/i.test(h.name);

  let maxStreak = 0;
  let maxLongest = 0;
  for (const h of allHabits) {
    const hl = logs.filter((l) => l.habit_id === h.id);
    maxStreak = Math.max(maxStreak, computeCurrentStreak(h, hl));
    maxLongest = Math.max(maxLongest, computeLongestStreak(h, hl));
  }

  const hour = new Date().getHours();
  const rules: [string, boolean][] = [
    ['first_step', done.length >= 1],
    ['streak_3', maxStreak >= 3],
    ['on_fire_7', maxStreak >= 7],
    ['centurion_100', done.length >= 100],
    ['perfect_7', profile.quests_completed >= 0 && (await perfectDayCount(db, userId)) >= 7],
    ['consistency_30', maxLongest >= 30],
    ['bookworm_50', catCount(isRead) >= 50],
    ['fitness_50', catCount(isFit) >= 50],
    ['hydration_50', catCount(isWater) >= 50],
    ['zen_50', catCount(isZen) >= 50],
    ['quest_100', profile.quests_completed >= 100],
    ['lucky_25', profile.boxes_opened >= 25],
    ['coin_1000', profile.coins_earned >= 1000],
    ['night_owl', hour >= 0 && hour < 5],
    ['early_bird', hour >= 5 && hour < 7],
    ['comeback', maxStreak >= 1 && maxLongest >= 7 && done.length >= 2],
  ];
  for (const [key, cond] of rules) {
    if (cond && !owned.has(key)) {
      owned.add(key);
      await unlock(key);
    }
  }
  return out;
}

async function perfectDayCount(db: SupabaseClient, userId: string): Promise<number> {
  const { count } = await db
    .from('rpg_xp_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'allbonus');
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Mystery box, shop, leaderboard
// ---------------------------------------------------------------------------

export interface BoxResult {
  type: string;
  label: string;
  labelBn: string;
  amount: number;
}

export async function openBox(userId: string): Promise<BoxResult> {
  const db = getDbClient();
  const profile = await getProfile(db, userId);
  if (profile.mystery_boxes <= 0) throw new Error('No mystery boxes available');

  const roll = Math.random() * 100;
  let result: BoxResult;
  if (roll < 40) {
    const amount = 10 + Math.floor(Math.random() * 41);
    profile.coins_total += amount;
    profile.coins_earned += amount;
    result = { type: 'coins', label: `${amount} coins`, labelBn: `${amount} কয়েন`, amount };
  } else if (roll < 60) {
    profile.xp_potions += 1;
    result = { type: 'potion', label: 'XP Potion (2× 1h)', labelBn: 'XP পোশন (২× ১ ঘণ্টা)', amount: 1 };
  } else if (roll < 75) {
    const until = new Date();
    until.setHours(23, 59, 59, 999);
    profile.xp_multiplier_until = until.toISOString();
    result = { type: 'multiplier', label: 'XP Multiplier 1.5× today', labelBn: 'XP মাল্টিপ্লায়ার ১.৫× আজ', amount: 1 };
  } else if (roll < 87) {
    profile.streak_shields += 1;
    result = { type: 'shield', label: 'Streak Shield', labelBn: 'স্ট্রিক শিল্ড', amount: 1 };
  } else if (roll < 97) {
    profile.xp_total += 100;
    result = { type: 'xp', label: '+100 XP', labelBn: '+১০০ XP', amount: 100 };
  } else {
    profile.xp_total += 200;
    profile.coins_total += 100;
    profile.coins_earned += 100;
    result = { type: 'rare', label: 'RARE: +200 XP + 100 coins!', labelBn: 'বিরল: +২০০ XP + ১০০ কয়েন!', amount: 1 };
  }
  profile.mystery_boxes -= 1;
  profile.boxes_opened += 1;
  const lv = levelForXp(profile.xp_total);
  if (lv.level > profile.level) profile.level = lv.level;
  await saveProfile(db, profile);
  return result;
}

export async function buyItem(userId: string, key: string): Promise<string> {
  const db = getDbClient();
  const item = SHOP_ITEMS.find((i) => i.key === key);
  if (!item) throw new Error('Unknown item');
  const profile = await getProfile(db, userId);
  if (profile.coins_total < item.price) throw new Error('Not enough coins');

  if (key === 'random') {
    const amount = 10 + Math.floor(Math.random() * 31);
    profile.coins_total += amount - item.price;
    profile.coins_earned += amount;
    await saveProfile(db, profile);
    return `+${amount} coins`;
  }
  profile.coins_total -= item.price;
  if (key === 'shield') profile.streak_shields += 1;
  else if (key === 'potion') profile.xp_potions += 1;
  else if (key === 'multiplier') {
    const until = new Date();
    until.setHours(23, 59, 59, 999);
    profile.xp_multiplier_until = until.toISOString();
  } else if (key === 'box') profile.mystery_boxes += 1;
  await saveProfile(db, profile);
  return item.nameBn;
}

export async function usePotion(userId: string): Promise<void> {
  const db = getDbClient();
  const profile = await getProfile(db, userId);
  if (profile.xp_potions <= 0) throw new Error('No potions left');
  profile.xp_potions -= 1;
  const until = new Date(Date.now() + 60 * 60 * 1000);
  profile.xp_boost_until = until.toISOString();
  await saveProfile(db, profile);
}

export interface LeaderRow {
  username: string;
  level: number;
  weeklyXp: number;
  you: boolean;
}

export async function getLeaderboard(userId: string): Promise<{
  top: LeaderRow[];
  myRank: number;
  myXp: number;
  week: string;
}> {
  const db = getDbClient();
  const wk = weekKey(new Date());
  // Weekly XP per user — service_role read, usernames only (no sensitive data)
  const { data } = await db.from('rpg_xp_events').select('user_id, xp').gte('log_date', wk);
  const totals = new Map<string, number>();
  for (const r of (data || []) as { user_id: string; xp: number }[]) {
    totals.set(r.user_id, (totals.get(r.user_id) || 0) + Number(r.xp));
  }
  const ids = Array.from(totals.keys());
  let names = new Map<string, { username: string; level: number }>();
  if (ids.length > 0) {
    const { data: users } = await db.from('users').select('id, username').in('id', ids);
    const { data: profs } = await db.from('rpg_profiles').select('user_id, level').in('user_id', ids);
    const lv = new Map(((profs || []) as { user_id: string; level: number }[]).map((p) => [p.user_id, p.level]));
    names = new Map(
      ((users || []) as { id: string; username: string }[]).map((u) => [
        u.id,
        { username: u.username, level: lv.get(u.id) ?? 1 },
      ])
    );
  }
  const rows: LeaderRow[] = ids
    .filter((id) => names.has(id))
    .map((id) => ({
      username: names.get(id)!.username,
      level: names.get(id)!.level,
      weeklyXp: totals.get(id)!,
      you: id === userId,
    }))
    .sort((a, b) => b.weeklyXp - a.weeklyXp)
    .slice(0, 20);
  const myRank = rows.findIndex((r) => r.you) + 1;
  return { top: rows, myRank, myXp: totals.get(userId) ?? 0, week: wk };
}

export async function claimWeeklyRewards(userId: string): Promise<string | null> {
  const db = getDbClient();
  const profile = await getProfile(db, userId);
  const wk = weekKey(new Date());
  if (profile.last_reward_week === wk) return null; // already settled this week
  // Settle PREVIOUS week
  const prev = new Date();
  prev.setDate(prev.getDate() - 7);
  const prevWk = weekKey(prev);
  if ((profile.last_reward_week || '') >= prevWk && profile.last_reward_week !== null) {
    profile.last_reward_week = wk;
    await saveProfile(db, profile);
    return null;
  }
  const { data } = await db.from('rpg_xp_events').select('user_id, xp').gte('log_date', prevWk).lt('log_date', wk);
  const totals = new Map<string, number>();
  for (const r of (data || []) as { user_id: string; xp: number }[]) {
    totals.set(r.user_id, (totals.get(r.user_id) || 0) + Number(r.xp));
  }
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([id]) => id === userId) + 1;
  profile.last_reward_week = wk;
  if (rank === 1) {
    profile.coins_total += 100;
    profile.coins_earned += 100;
    profile.mystery_boxes += 1;
    await saveProfile(db, profile);
    return '🥇 Rank #1! +100 coins + mystery box';
  } else if (rank === 2 || rank === 3) {
    profile.coins_total += 50;
    profile.coins_earned += 50;
    await saveProfile(db, profile);
    return `Rank #${rank}! +50 coins`;
  }
  await saveProfile(db, profile);
  return null;
}
