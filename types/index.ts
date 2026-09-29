export type FrequencyType = 'daily' | 'specific_days' | 'times_per_week';
export type GoalType = 'checkbox' | 'quantity';
export type HabitCategory = 'health' | 'study' | 'productivity' | 'custom' | string;

export interface User {
  id: string;
  username: string;
  password_hash: string;
  birth_date_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  frequency_type: FrequencyType;
  frequency_days: number[] | null; // 0=Sun..6=Sat
  frequency_target: number | null;
  goal_type: GoalType;
  target_value: number | null;
  unit_label: string | null;
  color: string;
  icon_svg: string | null;
  reminder_time: string | null;
  archived: boolean;
  paused: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  completed_value: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiAgentLog {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used: string | null;
  created_at: string;
}

export type ActionResponse<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface SessionPayload {
  userId: string;
  username: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface HabitWithStatus extends Habit {
  todayLog?: HabitLog | null;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  isCompletedToday: boolean;
}

export interface MoodLog {
  id: string;
  user_id: string;
  log_date: string;
  mood: number;
  energy: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  jti: string;
  device: string | null;
  created_at: string;
  last_seen: string;
  current?: boolean;
}

// ---------------------------------------------------------------------------
// User preferences (stored in public.user_preferences as JSONB, cached in
// localStorage, synced across devices via server actions).
// ---------------------------------------------------------------------------

export type AppLanguage = 'bn' | 'en';
/** light | dark | system (follows device) | high-contrast (WCAG AAA) */
export type ThemeChoice = 'light' | 'dark' | 'system' | 'high-contrast';
export type AgentProactivity = 'manual' | 'daily_tip' | 'weekly_report';
export type ReplyLength = 'short' | 'normal' | 'detailed';

export interface NotificationPrefs {
  enabled: boolean;
  dailySummaryTime: string | null; // HH:MM
  quietStart: string | null; // HH:MM
  quietEnd: string | null; // HH:MM
  streakWarning: boolean;
}

export interface AiPrefs {
  proactivity: AgentProactivity;
  replyLength: ReplyLength;
  language: 'auto' | 'bn' | 'en';
  allowActions: boolean; // false = AI only chats, never calls tools
}

export interface UserPreferences {
  language: AppLanguage;
  theme: ThemeChoice;
  accent: string | null; // hex override, null = design-system default
  weekStart: 0 | 1 | 6; // 0=Sun, 1=Mon, 6=Sat
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  hour12: boolean;
  dayStartHour: number; // 0-5, day boundary hour (0 = midnight)
  defaultCategory: string;
  defaultColor: string;
  defaultFrequency: FrequencyType;
  graceDaysPerMonth: number; // streak freeze allowance
  notifications: NotificationPrefs;
  ai: AiPrefs;
}

export const DEFAULT_PREFS: UserPreferences = {
  language: 'bn',
  theme: 'light',
  accent: null,
  weekStart: 6,
  dateFormat: 'DD/MM/YYYY',
  hour12: true,
  dayStartHour: 0,
  defaultCategory: 'health',
  defaultColor: '#2E7D6B',
  defaultFrequency: 'daily',
  graceDaysPerMonth: 0,
  notifications: {
    enabled: false,
    dailySummaryTime: null,
    quietStart: null,
    quietEnd: null,
    streakWarning: true,
  },
  ai: {
    proactivity: 'manual',
    replyLength: 'normal',
    language: 'auto',
    allowActions: true,
  },
};
