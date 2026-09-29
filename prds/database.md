# Database PRD — Habit Tracker Web App

**Target platform:** Supabase (PostgreSQL)
**Purpose:** This document is the single source of truth for the database layer. An AI coding agent should use this to generate the SQL migrations, RLS policies, and any ORM/query code.

---

## 1. Overview

The app is a multi-tenant habit tracker. Every row of user-owned data must be scoped to that user via `user_id`, and Row Level Security (RLS) must enforce isolation at the database level — never rely on application code alone to filter by user.

Auth is **custom** (not Supabase Auth), because the app uses username/password + birth-date-based reset instead of email/OTP. This means:
- We manage our own `users` table and our own session tokens.
- Supabase's built-in `auth.uid()` is **not** available, since we're not using Supabase Auth.
- RLS policies must instead check a `user_id` column against a value passed via a custom claim/session mechanism (see §5).

---

## 2. Tables

### 2.1 `users`

Stores account credentials. No plaintext secrets ever stored.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `username` | `text` | `unique`, `not null` | Case-insensitive uniqueness enforced via a functional unique index on `lower(username)` |
| `password_hash` | `text` | `not null` | bcrypt hash |
| `birth_date_hash` | `text` | `not null` | bcrypt hash of the birth date string (e.g. `YYYY-MM-DD`), used only for password-reset verification |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | Bump on any credential change |

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  birth_date_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_username_lower_idx on users (lower(username));
```

**Notes for the coding agent:**
- Never store the raw birth date. Hash it the same way as the password (bcrypt, same salt-rounds config).
- Username comparisons throughout the app (login, signup uniqueness check, reset) must be case-insensitive — always compare against `lower(username)`.

---

### 2.2 `habits`

One row per habit a user has created.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | `not null`, FK → `users(id)` on delete cascade | |
| `name` | `text` | `not null` | |
| `category` | `text` | nullable | e.g. `health`, `study`, `productivity`, `custom` |
| `frequency_type` | `text` | `not null`, check in `('daily','specific_days','times_per_week')` | |
| `frequency_days` | `int[]` | nullable | Used when `frequency_type = 'specific_days'`; 0=Sun..6=Sat |
| `frequency_target` | `int` | nullable | Used when `frequency_type = 'times_per_week'` |
| `goal_type` | `text` | `not null`, check in `('checkbox','quantity')` | |
| `target_value` | `numeric` | nullable | Only meaningful when `goal_type = 'quantity'` |
| `unit_label` | `text` | nullable | e.g. "glasses", "minutes" |
| `color` | `text` | `not null` | Hex string, e.g. `#2E7D6B` |
| `icon_svg` | `text` | nullable | Raw SVG markup or a reference key to a stored icon asset |
| `reminder_time` | `time` | nullable | Local time of day for browser notification |
| `archived` | `boolean` | `not null`, default `false` | Soft-delete instead of hard delete, so history isn't lost |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

```sql
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  category text,
  frequency_type text not null check (frequency_type in ('daily','specific_days','times_per_week')),
  frequency_days int[],
  frequency_target int,
  goal_type text not null check (goal_type in ('checkbox','quantity')),
  target_value numeric,
  unit_label text,
  color text not null default '#2E7D6B',
  icon_svg text,
  reminder_time time,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index habits_user_id_idx on habits (user_id) where archived = false;
```

---

### 2.3 `habit_logs`

One row per (habit, date) — the actual daily record.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `habit_id` | `uuid` | `not null`, FK → `habits(id)` on delete cascade | |
| `user_id` | `uuid` | `not null`, FK → `users(id)` on delete cascade | Denormalized for simpler RLS + queries |
| `log_date` | `date` | `not null` | The calendar day this entry represents (not a timestamp) |
| `completed_value` | `numeric` | nullable | For checkbox habits: `1` = done, `0`/null = not done. For quantity habits: the actual logged amount |
| `note` | `text` | nullable | Optional journal note for that day |
| `created_at` | `timestamptz` | default `now()` | |
| `updated_at` | `timestamptz` | default `now()` | |

```sql
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  log_date date not null,
  completed_value numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index habit_logs_habit_id_date_idx on habit_logs (habit_id, log_date);
create index habit_logs_user_id_idx on habit_logs (user_id);
```

**Notes for the coding agent:**
- The `unique (habit_id, log_date)` constraint means "marking a habit done for a date" is an upsert (`insert ... on conflict (habit_id, log_date) do update`), not a plain insert.
- Streaks are **computed**, not stored as a running counter, to avoid drift. See §4.

---

### 2.4 `ai_agent_logs` (optional but recommended)

Stores AI agent interactions for debugging and for giving the agent conversation context.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | `not null`, FK → `users(id)` on delete cascade | |
| `role` | `text` | `not null`, check in `('user','assistant')` | |
| `content` | `text` | `not null` | |
| `model_used` | `text` | nullable | Which of the two OpenRouter models actually served this response |
| `created_at` | `timestamptz` | default `now()` | |

```sql
create table ai_agent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  model_used text,
  created_at timestamptz not null default now()
);

create index ai_agent_logs_user_id_idx on ai_agent_logs (user_id, created_at desc);
```

---

## 3. Row Level Security (RLS)

Because auth is custom (no `auth.uid()`), the app must set a session-scoped Postgres variable per request, and RLS policies read from it.

**Approach:** Use `set_config('app.current_user_id', <uuid>, true)` at the start of each authenticated database transaction (via Supabase's `pg` connection or a Postgres function), then reference it in policies with `current_setting('app.current_user_id', true)::uuid`.

```sql
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table ai_agent_logs enable row level security;

create policy "habits_owner_only" on habits
  for all
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy "habit_logs_owner_only" on habit_logs
  for all
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);

create policy "ai_agent_logs_owner_only" on ai_agent_logs
  for all
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
```

The `users` table itself does **not** need row-level policies scoped by `user_id` (there's no "owner" concept for the row that stores your own identity) — instead, access to `users` should only ever happen through tightly controlled server-side functions (signup, login, reset), never through a general-purpose client query. Enable RLS on it too and deny all direct access, forcing all reads/writes through `security definer` Postgres functions or server-only service-role calls:

```sql
alter table users enable row level security;
-- No policies added => all direct access denied by default.
-- All access happens through server-side code using the service role key,
-- which bypasses RLS intentionally and exclusively on the server.
```

**Critical implementation note for the coding agent:** the `service_role` key must never be exposed to the browser. All `users` table access and all `set_config` calls happen in server-side code only (Next.js Server Actions / Route Handlers), never in client components.

---

## 4. Derived Data (Computed, Not Stored)

To avoid data drift, the following are computed on read rather than stored as mutable counters:

- **Current streak**: count consecutive `log_date`s ending today/yesterday (depending on habit frequency) where `completed_value` indicates completion.
- **Longest streak**: max run length across all `habit_logs` for a habit.
- **Completion rate**: `count(completed logs in range) / count(expected logs in range)`.
- **Heatmap data**: a `group by log_date` aggregation over a date range.

If performance becomes an issue at scale, add a `streaks_cache` materialized table later — but do not build this in v1.

---

## 5. Auth Data Flow Summary (for context — full detail in architecture.md)

1. **Signup:** insert into `users` with hashed password + hashed birth date.
2. **Login:** look up by `lower(username)`, verify password hash, issue a session token (JWT or signed cookie) containing `user_id`.
3. **Each authenticated request:** server reads the session token, extracts `user_id`, calls `set_config('app.current_user_id', user_id, true)` on the Postgres connection before running any query.
4. **Password reset:** verify `username` + `birth_date` hash match, then allow a new password to be set.

---

## 6. Migration Order

1. `users`
2. `habits` (depends on `users`)
3. `habit_logs` (depends on `habits`, `users`)
4. `ai_agent_logs` (depends on `users`)
5. Enable RLS + policies on all four tables
6. Indexes

---

## 7. Open Questions for the Coding Agent to Flag Back (not blockers, but worth confirming before finalizing)

- Time zone handling for `log_date` — should be stored as the user's local calendar date, not UTC-shifted, or streaks will look wrong near midnight. Recommend capturing the client's local date directly rather than deriving it from a UTC timestamp server-side.
- Whether `habit_logs.completed_value` for checkbox habits should be boolean instead of numeric for clarity — numeric was chosen here so both goal types share one column, but a coding agent could reasonably suggest splitting into `completed boolean` + `quantity_value numeric` for readability.
