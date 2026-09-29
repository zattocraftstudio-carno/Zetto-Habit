import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { getDbClient } from '@/lib/db';
import {
  formatDate,
  computeCurrentStreak,
  computeLongestStreak,
  computeCompletionRate,
  isLogCompleted,
} from '@/lib/streaks';
import { Habit, HabitLog } from '@/types';

const aiRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const AI_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_AI_CALLS_PER_HOUR = 20;
const MAX_AGENT_STEPS = 5;

export const AI_MODELS = [
  'stealth/space-bunny-alpha',
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'liquid/lfm-2.5-2.6b:free',
];

export const GROQ_MODEL = process.env.GROQ_MODEL_MAIN || 'openai/gpt-oss-120b';

// Model-switch allowlist shared by API route validation.
// 'auto' = Groq first, then the OpenRouter chain. 'groq' = Groq only.
// Any other value must be one of AI_MODELS (OpenRouter-only).
export const MODEL_CHOICES = ['auto', 'groq'] as const;
export type ModelChoice = (typeof MODEL_CHOICES)[number] | string;

export function resolveModelChoice(raw: unknown): string {
  if (raw === 'auto' || raw === 'groq') return raw;
  if (typeof raw === 'string' && (AI_MODELS as string[]).includes(raw)) return raw;
  return 'auto';
}

export type AgentLanguage = 'auto' | 'bn' | 'en';

export function resolveLanguage(raw: unknown): AgentLanguage {
  if (raw === 'bn' || raw === 'en' || raw === 'auto') return raw;
  return 'auto';
}

async function logInteraction(
  db: ReturnType<typeof getDbClient>,
  userId: string,
  userMessage: string,
  assistantReply: string,
  modelUsed: string
): Promise<void> {
  await db.rpc('app_log_ai_interaction', {
    p_user_id: userId,
    p_role: 'user',
    p_content: userMessage,
    p_model_used: modelUsed,
  });
  await db.rpc('app_log_ai_interaction', {
    p_user_id: userId,
    p_role: 'assistant',
    p_content: assistantReply,
    p_model_used: modelUsed,
  });
}

export async function getUserHabitSummary(userId: string) {
  const db = getDbClient();
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [habitsRes, logsRes] = await Promise.all([
    db.rpc('app_get_habits', { p_user_id: userId }),
    db.rpc('app_get_habit_logs_for_range', {
      p_user_id: userId,
      p_start_date: formatDate(thirtyDaysAgo),
      p_end_date: formatDate(today),
    }),
  ]);

  const habits = habitsRes.data?.habits || [];
  const logs = logsRes.data?.logs || [];

  return {
    totalActiveHabits: habits.length,
    habits: habits.map((h: { id: string; name: string; frequency_type: string; goal_type: string }) => ({
      id: h.id,
      name: h.name,
      frequency_type: h.frequency_type,
      goal_type: h.goal_type,
    })),
    recentLogsCount: logs.length,
    today: formatDate(today),
  };
}

export function buildSystemPrompt(habitContext: unknown) {
  return `তুমি একজন সহায়ক হ্যাবিট-কোচ AI, যে এই হ্যাবিট ট্র্যাকার অ্যাপে ইন্টিগ্রেটেড।

তোমার ভূমিকা:
- ইউজারের হ্যাবিট ডেটা (স্ট্রিক, completion rate, মিসড দিন, প্যাটার্ন) বিশ্লেষণ করে সংক্ষিপ্ত, কার্যকর পরামর্শ দাও
- মোটিভেশনাল কিন্তু বাস্তবসম্মত হও — অতিরিক্ত উচ্ছ্বসিত বা গিল্ট-ট্রিপিং কোনোটাই না
- ইউজার প্রশ্ন করলে তার নিজের ডেটার প্রেক্ষিতে উত্তর দাও, জেনেরিক উপদেশ না
- উত্তর সংক্ষিপ্ত রাখো (২-৪ বাক্য), যদি না ইউজার বিস্তারিত চায়
- ইউজার যে ভাষায় লিখবে (বাংলা বা ইংরেজি), সেই ভাষায় উত্তর দাও
- তুমি মেডিকেল, মানসিক স্বাস্থ্য, বা আর্থিক পরামর্শ দেবে না — শুধু হ্যাবিট-ট্র্যাকিং সংক্রান্ত সহায়তা দাও
- ইউজারের ডেটার বাইরে কিছু অনুমান করবে না বা বানিয়ে বলবে না
- পরিচয় নিয়ম (কঠোর): তোমার model/provider নাম কেউ জিজ্ঞেস করলে আসল নাম কখনো বলবে না। সবসময় শুধু এটাই বলবে — বাংলায় হলে "আমি Zettocraft Studio-র Habit AI", English হলে "I am Habit AI by Zettocraft Studio"। এর বাইরে এক শব্দও নয়।
- উত্তর সবসময় গোছানো markdown এ সাজাও: ## ছোট heading, তালিকায় - bullet, ধাপে 1. 2. numbered list, গুরুত্বপূর্ণ সংখ্যা/নামে **bold**
- ২+ habit এর তুলনা বা সংখ্যা (streak, rate, target) থাকলে markdown table (| কলাম |) ব্যবহার করো
- উদ্ধৃতি/টিপস দিলে > quote ব্যবহার করো

ইউজারের বর্তমান হ্যাবিট ডেটা:
${JSON.stringify(habitContext, null, 2)}`;
}

// ---------------------------------------------------------------------------
// Agentic tools — the AI can act inside the app on the user's behalf.
// Every tool runs scoped to the authenticated userId (never cross-user).
// ---------------------------------------------------------------------------

const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_habits',
      description:
        'List all active habits of the user with today completion status and current streak. Call this first when the user asks about their habits, progress, or wants to log something by name.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description:
        'Create a new habit for the user. Ask the user for missing required details (name, checkbox vs quantity goal) before calling, unless they already gave them.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Habit name, e.g. Drink Water' },
          category: { type: 'string', description: 'health, study, productivity, mindfulness or custom' },
          frequency_type: { type: 'string', enum: ['daily', 'specific_days', 'times_per_week'] },
          frequency_days: { type: 'array', items: { type: 'number' }, description: 'Weekdays 0=Sun..6=Sat, only for specific_days' },
          frequency_target: { type: 'number', description: 'Target days per week 1-7, only for times_per_week' },
          goal_type: { type: 'string', enum: ['checkbox', 'quantity'] },
          target_value: { type: 'number', description: 'Required for quantity goals, e.g. 8' },
          unit_label: { type: 'string', description: 'Unit for quantity goals, e.g. glasses' },
          color: { type: 'string', description: 'Hex color, e.g. #2E7D6B' },
          icon: { type: 'string', description: 'Icon key, e.g. water, book, dumbbell, moon, code' },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_habit',
      description:
        'Log/track a habit for a date (completes it, sets quantity, adds a note). Use list_habits first if you do not know the exact habit name.',
      parameters: {
        type: 'object',
        properties: {
          habit: { type: 'string', description: 'Habit name or id, e.g. Drink Water' },
          date: { type: 'string', description: 'YYYY-MM-DD, defaults to today. Never a future date.' },
          value: { type: 'number', description: '1 = done for checkbox habits; amount for quantity habits' },
          note: { type: 'string', description: 'Optional note for the day' },
        },
        required: ['habit'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_habit_history',
      description: 'Get recent log history and completion stats for one habit.',
      parameters: {
        type: 'object',
        properties: {
          habit: { type: 'string', description: 'Habit name or id' },
          days: { type: 'number', description: 'How many past days, default 30, max 365' },
        },
        required: ['habit'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_report',
      description:
        'Get the full progress report data: per-habit streaks, completion rates, and today completion. Call this when the user asks for a report, summary, analysis, or dashboard overview.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Window in days, default 30, max 90' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_settings',
      description:
        'Read the current app settings/preferences (theme, language, accent, week start, notifications, habit defaults, AI prefs). Call this before changing anything or when the user asks what their settings are.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_settings',
      description:
        'Change app settings for the user: theme (light/dark/system), language (bn/en), accent color hex, week start day (0=Sun,1=Mon,6=Sat), date format, 12/24 hour, day-start hour (0-5), default category/color/frequency, grace days (0-7), notifications (enabled, dailySummaryTime, quietStart, quietEnd, streakWarning), AI prefs (proactivity, replyLength, language). Only set fields the user asked about.',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['bn', 'en'] },
          theme: { type: 'string', enum: ['light', 'dark', 'system'] },
          accent: { type: 'string', description: 'Hex color like #2E7D6B, or empty string to reset to default' },
          weekStart: { type: 'number', enum: [0, 1, 6] },
          dateFormat: { type: 'string', enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
          hour12: { type: 'boolean' },
          dayStartHour: { type: 'number', description: '0-5' },
          defaultCategory: { type: 'string' },
          defaultColor: { type: 'string' },
          defaultFrequency: { type: 'string', enum: ['daily', 'specific_days', 'times_per_week'] },
          graceDaysPerMonth: { type: 'number', description: '0-7' },
          notifications: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              dailySummaryTime: { type: 'string', description: 'HH:MM or empty to clear' },
              quietStart: { type: 'string', description: 'HH:MM or empty to clear' },
              quietEnd: { type: 'string', description: 'HH:MM or empty to clear' },
              streakWarning: { type: 'boolean' },
            },
            additionalProperties: false,
          },
          ai: {
            type: 'object',
            properties: {
              proactivity: { type: 'string', enum: ['manual', 'daily_tip', 'weekly_report'] },
              replyLength: { type: 'string', enum: ['short', 'normal', 'detailed'] },
              language: { type: 'string', enum: ['auto', 'bn', 'en'] },
              allowActions: { type: 'boolean', description: 'Master switch: false = AI only chats, never acts' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search',
      description:
        'Search the user data by keyword: habit names, categories, and words inside daily notes. Use when the user asks to find something (e.g. "find my water notes", "which habits mention exam").',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Word to search for' },
          limit: { type: 'number', description: 'Max results, default 20' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archive_habit',
      description:
        'Archive (soft-delete) a habit by name or id. History is preserved. Only do this when the user clearly asks to remove/delete a habit — confirm the name back to them afterwards.',
      parameters: {
        type: 'object',
        properties: {
          habit: { type: 'string', description: 'Habit name or id' },
        },
        required: ['habit'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_log',
      description: 'Delete one daily log entry (habit + date). Use when the user says a log was a mistake.',
      parameters: {
        type: 'object',
        properties: {
          habit: { type: 'string', description: 'Habit name or id' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
        },
        required: ['habit', 'date'],
        additionalProperties: false,
      },
    },
  },
];

const createHabitToolSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(30).nullable().optional(),
  frequency_type: z.enum(['daily', 'specific_days', 'times_per_week']).default('daily'),
  frequency_days: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  frequency_target: z.number().int().min(1).max(7).nullable().optional(),
  goal_type: z.enum(['checkbox', 'quantity']).default('checkbox'),
  target_value: z.number().positive().nullable().optional(),
  unit_label: z.string().max(30).nullable().optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .default('#2E7D6B'),
  icon: z.string().max(30).nullable().optional(),
});

async function fetchHabits(db: SupabaseClient, userId: string): Promise<Habit[]> {
  const { data, error } = await db.rpc('app_get_habits', { p_user_id: userId });
  if (error || !data?.success) throw new Error('Could not load habits');
  return (data.habits || []) as Habit[];
}

function resolveHabit(habits: Habit[], identifier: string): Habit | null {
  const norm = identifier.trim().toLowerCase();
  const byId = habits.find((h) => h.id.toLowerCase() === norm);
  if (byId) return byId;
  const exact = habits.find((h) => h.name.trim().toLowerCase() === norm);
  if (exact) return exact;
  return habits.find((h) => h.name.toLowerCase().includes(norm)) || null;
}

async function buildDashboardData(userId: string, days: number) {
  const db = getDbClient();
  const today = new Date();
  const todayStr = formatDate(today);
  const start = new Date(today);
  start.setDate(today.getDate() - days + 1);

  const [habitsRes, logsRes] = await Promise.all([
    db.rpc('app_get_habits', { p_user_id: userId }),
    db.rpc('app_get_habit_logs_for_range', {
      p_user_id: userId,
      p_start_date: formatDate(start),
      p_end_date: todayStr,
    }),
  ]);
  const habits = ((habitsRes.data?.habits || []) as Habit[]).filter((h) => !h.archived);
  const logs = (logsRes.data?.logs || []) as HabitLog[];

  const perHabit = habits.map((h) => {
    const hLogs = logs.filter((l) => l.habit_id === h.id);
    const todayLog = hLogs.find((l) => l.log_date === todayStr);
    return {
      id: h.id,
      name: h.name,
      goal_type: h.goal_type,
      target: h.goal_type === 'quantity' ? `${h.target_value ?? 1} ${h.unit_label ?? ''}`.trim() : 'checkbox',
      doneToday: isLogCompleted(h, todayLog),
      currentStreak: computeCurrentStreak(h, hLogs, todayStr),
      longestStreak: computeLongestStreak(h, hLogs),
      completionRate: computeCompletionRate(h, hLogs, days, todayStr),
    };
  });

  const doneTodayCount = perHabit.filter((h) => h.doneToday).length;
  return {
    date: todayStr,
    windowDays: days,
    totalHabits: habits.length,
    completedToday: doneTodayCount,
    todayCompletionPct: habits.length > 0 ? Math.round((doneTodayCount / habits.length) * 100) : 0,
    habits: perHabit,
  };
}

const settingsToolSchema = z.object({
  language: z.enum(['bn', 'en']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  accent: z.string().max(30).nullable().optional(),
  weekStart: z.union([z.literal(0), z.literal(1), z.literal(6)]).optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  hour12: z.boolean().optional(),
  dayStartHour: z.number().int().min(0).max(5).optional(),
  defaultCategory: z.string().max(30).optional(),
  defaultColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  defaultFrequency: z.enum(['daily', 'specific_days', 'times_per_week']).optional(),
  graceDaysPerMonth: z.number().int().min(0).max(7).optional(),
  notifications: z
    .object({
      enabled: z.boolean().optional(),
      dailySummaryTime: z.string().max(5).nullable().optional(),
      quietStart: z.string().max(5).nullable().optional(),
      quietEnd: z.string().max(5).nullable().optional(),
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

function cleanTime(v: unknown): string | null | undefined {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v)) return v;
  return undefined; // invalid → leave unchanged
}

async function executeAgentTool(
  userId: string,
  toolName: string,
  rawArgs: unknown
): Promise<{ summary: string; action: string; prefsChanged?: boolean }> {
  const db = getDbClient();
  const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>;

  if (toolName === 'list_habits') {
    const dash = await buildDashboardData(userId, 30);
    if (dash.totalHabits === 0) {
      return { summary: 'The user has no active habits yet.', action: 'Checked habits (none yet)' };
    }
    const lines = dash.habits.map(
      (h) =>
        `- ${h.name} [${h.goal_type}${h.goal_type === 'quantity' ? `: ${h.target}` : ''}] — done today: ${h.doneToday ? 'yes' : 'no'}, streak: ${h.currentStreak} days`
    );
    return {
      summary: `Active habits (${dash.totalHabits}):\n${lines.join('\n')}`,
      action: `Checked ${dash.totalHabits} habits`,
    };
  }

  if (toolName === 'create_habit') {
    const parsed = createHabitToolSchema.safeParse(args);
    if (!parsed.success) {
      return {
        summary: `Could not create habit: ${parsed.error.errors[0].message}. Ask the user for the missing detail.`,
        action: 'Habit creation failed (missing detail)',
      };
    }
    const v = parsed.data;
    if (v.goal_type === 'quantity' && !v.target_value) {
      return {
        summary: 'Could not create habit: quantity goals need a target_value and unit_label. Ask the user.',
        action: 'Habit creation failed (missing target)',
      };
    }
    const { data, error } = await db.rpc('app_create_habit', {
      p_user_id: userId,
      p_name: v.name.trim(),
      p_category: v.category || null,
      p_frequency_type: v.frequency_type,
      p_frequency_days: v.frequency_type === 'specific_days' ? v.frequency_days || [] : null,
      p_frequency_target: v.frequency_type === 'times_per_week' ? v.frequency_target || 1 : null,
      p_goal_type: v.goal_type,
      p_target_value: v.goal_type === 'quantity' ? v.target_value || 1 : null,
      p_unit_label: v.goal_type === 'quantity' ? v.unit_label || '' : null,
      p_color: v.color,
      p_icon_svg: v.icon || 'water',
      p_reminder_time: null,
    });
    if (error || !data?.success) {
      return { summary: `Could not create habit: ${data?.error || 'database error'}.`, action: 'Habit creation failed' };
    }
    const h = data.habit as Habit;
    const desc =
      h.goal_type === 'quantity'
        ? `${h.target_value} ${h.unit_label || 'units'}`
        : h.frequency_type === 'daily'
          ? 'daily'
          : h.frequency_type;
    return {
      summary: `Habit "${h.name}" created successfully (id ${h.id}, goal: ${desc}). Tell the user it is ready and visible on Home.`,
      action: `Created habit "${h.name}"`,
    };
  }

  if (toolName === 'log_habit') {
    const ident = String(args.habit || '').trim();
    if (!ident) return { summary: 'No habit specified.', action: 'Log failed (no habit)' };
    const habits = await fetchHabits(db, userId);
    const habit = resolveHabit(habits, ident);
    if (!habit) {
      return {
        summary: `No habit found matching "${ident}". Available: ${habits.map((h) => h.name).join(', ') || 'none'}. Ask the user which one.`,
        action: 'Log failed (habit not found)',
      };
    }
    const todayStr = formatDate(new Date());
    const date = typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : todayStr;
    if (date > todayStr) {
      return { summary: 'Cannot log future dates. Offer to log it for today instead.', action: 'Log blocked (future date)' };
    }
    const isQty = habit.goal_type === 'quantity';
    const target = Number(habit.target_value ?? 1);
    const value = args.value === null || args.value === undefined || args.value === '' ? (isQty ? target : 1) : Number(args.value);
    if (!Number.isFinite(value) || value < 0) {
      return { summary: 'Invalid value for logging. Ask the user for a valid amount.', action: 'Log failed (bad value)' };
    }
    const note = typeof args.note === 'string' ? args.note : null;
    const { data, error } = await db.rpc('app_upsert_habit_log', {
      p_user_id: userId,
      p_habit_id: habit.id,
      p_log_date: date,
      p_completed_value: value,
      p_note: note,
    });
    if (error || !data?.success) {
      return { summary: `Could not save the log: ${data?.error || 'database error'}.`, action: 'Log failed' };
    }
    const done = isQty ? value >= target : value >= 1;
    return {
      summary: `Logged "${habit.name}" for ${date}: ${isQty ? `${value}/${target} ${habit.unit_label || 'units'}` : done ? 'done' : 'marked not done'}${note ? ` with note "${note}"` : ''}. Confirm this warmly to the user.`,
      action: `Logged "${habit.name}" (${date})`,
    };
  }

  if (toolName === 'get_habit_history') {
    const ident = String(args.habit || '').trim();
    const days = Math.min(365, Math.max(1, Number(args.days) || 30));
    const habits = await fetchHabits(db, userId);
    const habit = resolveHabit(habits, ident);
    if (!habit) {
      return { summary: `No habit found matching "${ident}".`, action: 'History failed (not found)' };
    }
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - days + 1);
    const { data } = await db.rpc('app_get_habit_logs_by_habit', {
      p_user_id: userId,
      p_habit_id: habit.id,
      p_start_date: formatDate(start),
      p_end_date: formatDate(today),
    });
    const logs = ((data?.logs || []) as HabitLog[]).sort((a, b) => b.log_date.localeCompare(a.log_date));
    const completed = logs.filter((l) => isLogCompleted(habit, l)).length;
    return {
      summary: `"${habit.name}" last ${days} days: ${completed}/${days} completed days, current streak ${computeCurrentStreak(habit, logs)}, longest ${computeLongestStreak(habit, logs)}, rate ${computeCompletionRate(habit, logs, days)}%. Recent: ${logs
        .slice(0, 7)
        .map((l) => `${l.log_date}=${l.completed_value ?? 0}`)
        .join(', ') || 'no logs'}.`,
      action: `Checked history of "${habit.name}"`,
    };
  }

  if (toolName === 'get_dashboard_report') {
    const days = Math.min(90, Math.max(7, Number(args.days) || 30));
    const dash = await buildDashboardData(userId, days);
    return {
      summary: `Dashboard data (JSON): ${JSON.stringify(dash)}`,
      action: `Analyzed dashboard (${dash.totalHabits} habits)`,
    };
  }

  if (toolName === 'get_settings') {
    const { getPreferences } = await import('@/actions/preferences');
    const res = await getPreferences();
    if (!res.success) return { summary: 'Could not load settings.', action: 'Settings read failed' };
    return {
      summary: `Current settings (JSON): ${JSON.stringify(res.data)}`,
      action: 'Checked settings',
    };
  }

  if (toolName === 'update_settings') {
    const parsed = settingsToolSchema.safeParse(args);
    if (!parsed.success) {
      return {
        summary: `Invalid setting value: ${parsed.error.errors[0].message}. Ask the user for a valid value.`,
        action: 'Setting update failed',
      };
    }
    const v = parsed.data;
    const partial: Record<string, unknown> = {};
    if (v.language) partial.language = v.language;
    if (v.theme) partial.theme = v.theme;
    if (v.accent !== undefined) {
      if (v.accent === null || v.accent === '') partial.accent = null;
      else if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.accent)) partial.accent = v.accent;
      else return { summary: 'Invalid accent color. Use a hex color like #2E7D6B.', action: 'Setting update failed' };
    }
    if (v.weekStart !== undefined) partial.weekStart = v.weekStart;
    if (v.dateFormat) partial.dateFormat = v.dateFormat;
    if (v.hour12 !== undefined) partial.hour12 = v.hour12;
    if (v.dayStartHour !== undefined) partial.dayStartHour = v.dayStartHour;
    if (v.defaultCategory) partial.defaultCategory = v.defaultCategory;
    if (v.defaultColor) partial.defaultColor = v.defaultColor;
    if (v.defaultFrequency) partial.defaultFrequency = v.defaultFrequency;
    if (v.graceDaysPerMonth !== undefined) partial.graceDaysPerMonth = v.graceDaysPerMonth;
    if (v.notifications) {
      const n: Record<string, unknown> = {};
      if (v.notifications.enabled !== undefined) n.enabled = v.notifications.enabled;
      const ds = cleanTime(v.notifications.dailySummaryTime);
      if (ds !== undefined) n.dailySummaryTime = ds;
      const qs = cleanTime(v.notifications.quietStart);
      if (qs !== undefined) n.quietStart = qs;
      const qe = cleanTime(v.notifications.quietEnd);
      if (qe !== undefined) n.quietEnd = qe;
      if (v.notifications.streakWarning !== undefined) n.streakWarning = v.notifications.streakWarning;
      if (Object.keys(n).length > 0) partial.notifications = n;
    }
    if (v.ai) partial.ai = v.ai;
    if (Object.keys(partial).length === 0) {
      return { summary: 'No valid setting fields provided. Ask the user what to change.', action: 'Setting update skipped' };
    }
    const { updatePreferences } = await import('@/actions/preferences');
    const res = await updatePreferences(partial as Parameters<typeof updatePreferences>[0]);
    if (!res.success) return { summary: `Could not save settings: ${res.error}`, action: 'Setting update failed' };
    const changed = Object.keys(partial).join(', ');
    return {
      summary: `Settings updated (${changed}). The app UI refreshes automatically. Confirm the change warmly to the user.`,
      action: `Updated settings (${changed})`,
      prefsChanged: true,
    };
  }

  if (toolName === 'search') {
    const q = String(args.query || '').trim().toLowerCase();
    const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
    if (!q) return { summary: 'Empty search query.', action: 'Search skipped' };
    const habits = await fetchHabits(db, userId);
    const matchedHabits = habits
      .filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.category || '').toLowerCase().includes(q) ||
          (h.unit_label || '').toLowerCase().includes(q)
      )
      .slice(0, limit)
      .map((h) => ({ id: h.id, name: h.name, category: h.category, archived: h.archived, paused: h.paused }));
    // Search inside daily notes (last 180 days)
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 180);
    const { data: logsRes } = await db.rpc('app_get_habit_logs_for_range', {
      p_user_id: userId,
      p_start_date: formatDate(start),
      p_end_date: formatDate(today),
    });
    const nameById = new Map(habits.map((h) => [h.id, h.name]));
    const matchedNotes = (((logsRes as { data?: { logs?: HabitLog[] } })?.data?.logs || []) as HabitLog[])
      .filter((l) => (l.note || '').toLowerCase().includes(q))
      .slice(0, limit)
      .map((l) => ({
        habit: nameById.get(l.habit_id) || l.habit_id,
        date: l.log_date,
        value: l.completed_value,
        note: (l.note || '').slice(0, 160),
      }));
    if (matchedHabits.length === 0 && matchedNotes.length === 0) {
      return { summary: `No habits or notes found containing "${args.query}".`, action: `Searched "${args.query}" (0 found)` };
    }
    return {
      summary: `Search results for "${args.query}" (JSON): ${JSON.stringify({ habits: matchedHabits, notes: matchedNotes })}`,
      action: `Searched "${args.query}" (${matchedHabits.length + matchedNotes.length} found)`,
    };
  }

  if (toolName === 'archive_habit') {
    const ident = String(args.habit || '').trim();
    if (!ident) return { summary: 'No habit specified.', action: 'Archive failed (no habit)' };
    const habits = await fetchHabits(db, userId);
    const habit = resolveHabit(habits, ident);
    if (!habit) {
      return {
        summary: `No habit found matching "${ident}". Available: ${habits.map((h) => h.name).join(', ') || 'none'}.`,
        action: 'Archive failed (not found)',
      };
    }
    const { error } = await db.from('habits').update({ archived: true }).eq('id', habit.id).eq('user_id', userId);
    if (error) return { summary: 'Could not archive the habit.', action: 'Archive failed' };
    return {
      summary: `Habit "${habit.name}" archived. History is preserved and it no longer appears on Home. Confirm this to the user.`,
      action: `Archived "${habit.name}"`,
    };
  }

  if (toolName === 'delete_log') {
    const ident = String(args.habit || '').trim();
    const date = String(args.date || '').trim();
    if (!ident || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { summary: 'Need a habit name and a valid date (YYYY-MM-DD).', action: 'Delete log failed' };
    }
    const habits = await fetchHabits(db, userId);
    const habit = resolveHabit(habits, ident);
    if (!habit) return { summary: `No habit found matching "${ident}".`, action: 'Delete log failed' };
    const { data: rows } = await db
      .from('habit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('habit_id', habit.id)
      .eq('log_date', date);
    if (!rows || rows.length === 0) {
      return { summary: `No log exists for "${habit.name}" on ${date}.`, action: 'Delete log (nothing found)' };
    }
    const { error } = await db.from('habit_logs').delete().eq('id', (rows[0] as { id: string }).id);
    if (error) return { summary: 'Could not delete the log.', action: 'Delete log failed' };
    return {
      summary: `Deleted the log for "${habit.name}" on ${date}. Confirm this to the user.`,
      action: `Deleted log (${habit.name}, ${date})`,
    };
  }

  return { summary: `Unknown tool "${toolName}". Do not call it again.`, action: 'Unknown tool skipped' };
}

// ---------------------------------------------------------------------------
// Provider calls with tool support
// ---------------------------------------------------------------------------

type Provider = { kind: 'groq' } | { kind: 'openrouter'; model: string };

interface ChatMessage {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

async function chatOnce(
  provider: Provider,
  messages: ChatMessage[],
  maxTokens: number,
  useTools: boolean
): Promise<{ content: string; toolCalls: ChatMessage['tool_calls'] }> {
  const isGroq = provider.kind === 'groq';
  const url = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
  const key = isGroq ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
  const model = isGroq ? GROQ_MODEL : provider.model;
  const label = isGroq ? `groq:${GROQ_MODEL}` : `openrouter:${provider.model}`;
  if (!key) throw new Error(`${label} key is not configured`);

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  };
  if (useTools) {
    body.tools = AGENT_TOOLS;
    body.tool_choice = 'auto';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: isGroq
      ? {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'User-Agent': 'HabitTracker/1.0 (AI Habit Coach)',
        }
      : {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://habit-tracker.local',
          'X-Title': 'Habit Tracker AI Coach',
        },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Some models reject the tools parameter — retry once as plain chat.
    if (res.status === 400 && useTools) {
      return chatOnce(provider, messages, maxTokens, false);
    }
    throw new Error(`${label} returned status ${res.status}`);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new Error(`${label} returned empty response`);
  return { content: (msg.content as string) ?? '', toolCalls: (msg.tool_calls as ChatMessage['tool_calls']) ?? [] };
}

function languageInstruction(language: AgentLanguage): string {
  if (language === 'bn') return 'CRITICAL: ইউজার যাই লিখুক, তোমার পুরো উত্তর শুধুমাত্র বাংলায় (Bengali) দেবে। No English sentences.';
  if (language === 'en') return 'CRITICAL: No matter what the user writes, respond ONLY in English. No Bengali sentences.';
  return 'ইউজার যে ভাষায় লিখবে (বাংলা বা ইংরেজি), সেই ভাষায় উত্তর দাও।';
}

const AGENT_CAPABILITIES = `তোমার কাছে app tools আছে — তুমি শুধু পরামর্শই দাও না, কাজও করে দাও:
- list_habits: ইউজারের habit list + আজকের status + streak দেখো
- create_habit: ইউজার চাইলে নতুন habit বানিয়ে দাও (name + checkbox/quantity goal জানা থাকতে হবে; না জানলে আগে জিজ্ঞেস করো)
- log_habit: ইউজারের হয়ে habit log/track করে দাও
- get_habit_history: কোনো habit এর history দেখো
- get_dashboard_report: পুরো progress data দেখো (report/summary চাইলে এটা আগে call করো)
- search: habit নাম, category বা note এর ভেতর কোনো শব্দ খুঁজে দাও
- get_settings / update_settings: app settings (theme, ভাষা, রঙ, নোটিফিকেশন, ডিফল্ট...) পড়ো ও বদলে দাও — বদলানোর আগে get_settings দিয়ে বর্তমান মান দেখে নাও
- archive_habit: ইউজার স্পষ্ট করে বললে habit আর্কাইভ করো (ইতিহাস থাকে)
- delete_log: ভুল log একটা মুছে দাও (habit + তারিখ)
নিয়ম: tool call করার পর ফলাফল (tool result) দেখে তারপর ইউজারকে চূড়ান্ত উত্তর দাও। নিশ্চিত না হলে অনুমান করে tool call করো না — আগে জিজ্ঞেস করো। Tool যা করেছে, সংক্ষেপে ইউজারকে জানাও। username/password/birth-date/account-delete কখনো tool দিয়ে বদলাবে না — এগুলো Settings পেজের কাজ, ইউজারকে সেখানে পাঠাও।
মনে রেখো: action permission ইউজারের হাতে — Settings → AI Agent থেকে সে যে কোনো সময় বন্ধ/চালু করতে পারে।`;

const REPORT_INSTRUCTION = `The user asked for a DETAILED REPORT. Steps: 1) Call get_dashboard_report (30 days). 2) Write a full report with markdown: ## headings for each section (সারসংক্ষেপ/Overview, Habit-wise ফলাফল, Streak ও Trend, সেরা ৩ পরামর্শ), a markdown | table | with one row per habit (columns: Habit | Streak | Rate | Today), - bullets for insights, **bold** for key numbers, > quote for the final motivational line. Be thorough — this is the one place where long answers are wanted.`;

export interface AgentOptions {
  language?: AgentLanguage;
  reportMode?: boolean;
  replyLength?: 'short' | 'normal' | 'detailed';
}

function maxTokensFor(replyLength: AgentOptions['replyLength'], reportMode: boolean): number {
  if (reportMode) return 1500;
  if (replyLength === 'short') return 250;
  if (replyLength === 'detailed') return 900;
  return 500;
}

export async function callAIAgent(
  userId: string,
  userMessage: string,
  preferredModel: string = 'auto',
  options: AgentOptions = {}
): Promise<{ reply: string; modelUsed: string; actions: string[]; prefsChanged: boolean }> {
  // Check rate limit
  const now = Date.now();
  const rate = aiRateLimitMap.get(userId);
  if (rate) {
    if (now - rate.windowStart < AI_RATE_LIMIT_WINDOW) {
      if (rate.count >= MAX_AI_CALLS_PER_HOUR) {
        throw new Error('AI Coach rate limit reached (max 20 calls/hour). Please try again later.');
      }
      rate.count++;
    } else {
      aiRateLimitMap.set(userId, { count: 1, windowStart: now });
    }
  } else {
    aiRateLimitMap.set(userId, { count: 1, windowStart: now });
  }

  const language = options.language === 'bn' || options.language === 'en' ? options.language : 'auto';
  const reportMode = options.reportMode === true;
  const maxTokens = maxTokensFor(options.replyLength, reportMode);

  const db = getDbClient();
  const habitContext = await getUserHabitSummary(userId);

  // Master permission switch (Settings → AI Agent): when off, the AI only
  // chats and advises — tools are never sent to any provider.
  let allowActions = true;
  try {
    const { data: prefRow } = await db
      .from('user_preferences')
      .select('prefs')
      .eq('user_id', userId)
      .maybeSingle();
    const aiPrefs = (prefRow?.prefs as { ai?: { allowActions?: boolean } } | null)?.ai;
    if (aiPrefs && aiPrefs.allowActions === false) allowActions = false;
  } catch {
    allowActions = true;
  }

  const capabilities = allowActions
    ? AGENT_CAPABILITIES
    : 'তোমার কোনো app tool নেই (ইউজার action permission বন্ধ রেখেছে)। তুমি শুধু কথা বলবে, পরামর্শ দেবে, রিপোর্ট লিখবে — habit বানানো/log/settings বদলানোর দাবি করবে না। কিছু করতে বললে Settings → AI Agent থেকে অনুমতি চালু করতে বলো। / You have NO app tools (user disabled action permission). Only chat and advise.';
  let systemPrompt = `${buildSystemPrompt(habitContext)}\n\n${capabilities}\n\n${languageInstruction(language)}`;
  if (reportMode) {
    const dash = await buildDashboardData(userId, 30);
    systemPrompt += `\n\n${REPORT_INSTRUCTION}\n\nPre-fetched dashboard (use tools for deeper detail if needed):\n${JSON.stringify(dash)}`;
  }

  // Fetch recent conversation history
  const historyRes = await db.rpc('app_get_recent_ai_logs', {
    p_user_id: userId,
    p_limit: 6,
  });

  const history = (historyRes.data?.logs || []).reverse();
  const baseMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((log: { role: string; content: string }) => ({
      role: log.role,
      content: log.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const choice = resolveModelChoice(preferredModel);
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey && !openRouterKey) {
    // Graceful fallback response when no API key is configured yet
    const defaultResponse =
      'নমস্কার! আমি আপনার এআই হ্যাবিট কোচ। চমৎকারভাবে হ্যাবিট ট্র্যাকিং চালিয়ে যান! প্রতিটা ছোট পদক্ষেপই বড় পরিবর্তনের সূচনা করে। (AI provider keys are currently being configured.)';
    await logInteraction(db, userId, userMessage, defaultResponse, 'local_preset');
    return { reply: defaultResponse, modelUsed: 'local_preset', actions: [], prefsChanged: false };
  }

  // Ordered provider attempts
  const providers: Provider[] =
    choice === 'groq'
      ? [{ kind: 'groq' }]
      : choice !== 'auto'
        ? [{ kind: 'openrouter', model: choice }]
        : [{ kind: 'groq' }, ...AI_MODELS.map((m) => ({ kind: 'openrouter' as const, model: m }))];

  let lastError: Error | null = null;

  for (const provider of providers) {
    const modelUsed = provider.kind === 'groq' ? `groq:${GROQ_MODEL}` : `openrouter:${provider.model}`;
    try {
      const convo: ChatMessage[] = [...baseMessages];
      const actions: string[] = [];
      let prefsChanged = false;

      for (let step = 0; step < MAX_AGENT_STEPS; step++) {
        const { content, toolCalls } = await chatOnce(provider, convo, maxTokens, allowActions);

        if (!toolCalls || toolCalls.length === 0) {
          if (!content || !content.trim()) throw new Error(`${modelUsed} returned empty response`);
          await logInteraction(db, userId, userMessage, content, modelUsed);
          return { reply: content, modelUsed, actions, prefsChanged };
        }

        convo.push({ role: 'assistant', content: content || '', tool_calls: toolCalls });
        for (const tc of toolCalls.slice(0, 4)) {
          let parsedArgs: unknown = {};
          try {
            parsedArgs = JSON.parse(tc.function?.arguments || '{}');
          } catch {
            parsedArgs = {};
          }
          const { summary, action, prefsChanged: pc } = await executeAgentTool(
            userId,
            tc.function?.name || '',
            parsedArgs
          );
          actions.push(action);
          if (pc) prefsChanged = true;
          convo.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: summary.slice(0, 2000),
          });
        }
      }
      throw new Error(`${modelUsed} could not finish the task`);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Agent attempt failed on ${provider.kind}:`, lastError.message);
      if (choice !== 'auto') {
        throw new Error('Our AI habit coach is temporarily unavailable. Please try again in a few moments.');
      }
      continue;
    }
  }

  void lastError;
  throw new Error('Our AI habit coach is temporarily unavailable. Please try again in a few moments.');
}

export async function clearAiHistory(userId: string): Promise<void> {
  const db = getDbClient();
  const { error } = await db.from('ai_agent_logs').delete().eq('user_id', userId);
  if (error) {
    throw new Error('Failed to clear chat history');
  }
}
