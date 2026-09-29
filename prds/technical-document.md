# Technical Document — Habit Tracker Web App

**Purpose:** This document covers implementation-level engineering detail not already covered by `architecture.md` (stack/flows), `database.md` (schema), or `design.md` (UI/UX): project structure, the API surface, environment configuration, coding conventions, error handling, testing, and deployment. An AI coding agent should treat all four PRDs together as the complete build spec.

---

## 1. Project Structure

```
habit-tracker/
├─ app/
│  ├─ (auth)/
│  │  ├─ login/page.tsx
│  │  ├─ signup/page.tsx
│  │  └─ forgot-password/page.tsx
│  ├─ (app)/                      # authenticated route group
│  │  ├─ home/page.tsx
│  │  ├─ dashboard/page.tsx
│  │  ├─ add-habit/page.tsx
│  │  ├─ track/[habitId]/page.tsx
│  │  └─ settings/page.tsx
│  ├─ api/
│  │  └─ ai-agent/route.ts        # AI proxy Route Handler
│  ├─ layout.tsx
│  └─ globals.css
├─ actions/                       # Server Actions
│  ├─ auth.ts                     # signup, login, resetPassword
│  ├─ habits.ts                   # createHabit, updateHabit, archiveHabit
│  └─ habitLogs.ts                # upsertLog, getLogsForRange
├─ lib/
│  ├─ db.ts                       # Supabase client factory (server-only, service role)
│  ├─ session.ts                  # cookie read/write, JWT sign/verify
│  ├─ hash.ts                     # bcrypt wrappers for password + birth date
│  ├─ streaks.ts                  # streak/completion-rate calculation helpers
│  └─ aiAgent.ts                  # OpenRouter fallback logic + system prompt builder
├─ components/
│  ├─ ui/                         # buttons, inputs, cards, toasts (design.md §6)
│  ├─ charts/                     # chart wrappers around Recharts
│  └─ icons/                      # custom SVG icon components
├─ middleware.ts                  # route protection — redirect unauthenticated users
├─ supabase/
│  └─ migrations/                 # SQL files matching database.md, in order
├─ .env.local.example
└─ package.json
```

---

## 2. API / Server Action Surface

Prefer Server Actions over Route Handlers for anything invoked only from within the app's own pages (simpler, colocated, no manual fetch boilerplate). Use a Route Handler only where a plain HTTP endpoint is genuinely needed — the AI agent call is a good example if it benefits from streaming.

| Action / Route | Type | Auth required | Purpose |
|---|---|---|---|
| `signup(data)` | Server Action | No | Create account |
| `login(data)` | Server Action | No | Authenticate, set session cookie |
| `logout()` | Server Action | Yes | Clear session cookie |
| `requestReset(username)` | Server Action | No | Step 1 of reset — always returns success-shaped response |
| `verifyResetBirthDate(username, birthDate)` | Server Action | No | Step 2 — returns a short-lived reset token on match |
| `submitNewPassword(resetToken, newPassword)` | Server Action | No (token-gated) | Step 3 |
| `createHabit(data)` | Server Action | Yes | Insert into `habits` |
| `updateHabit(id, data)` | Server Action | Yes | Update habit fields |
| `archiveHabit(id)` | Server Action | Yes | Soft-delete |
| `upsertHabitLog(habitId, date, value, note)` | Server Action | Yes | Mark done/undone, add note |
| `getDashboardData(range)` | Server Action | Yes | Aggregate query for charts/heatmap |
| `exportUserData()` | Server Action | Yes | Returns JSON/CSV blob |
| `POST /api/ai-agent` | Route Handler | Yes | Chat message → AI reply, with fallback |

**Convention:** every authenticated Server Action/Route Handler starts with the same three lines (extract session → get `user_id` → set Postgres session var), ideally factored into a shared `withAuth()` wrapper so it's not repeated in every function body.

```ts
// lib/withAuth.ts
export async function withAuth<T>(fn: (userId: string) => Promise<T>): Promise<T> {
  const userId = await getUserIdFromSession(); // throws if not authenticated
  const db = await getDbClient();
  await db.query("select set_config('app.current_user_id', $1, true)", [userId]);
  return fn(userId);
}
```

---

## 3. Environment Variables

```
# .env.local.example

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # server-only, never exposed to client

# Auth
SESSION_JWT_SECRET=             # long random string, server-only

# AI Agent
OPENROUTER_API_KEY=             # server-only
OPENROUTER_MODEL_MAIN=qwen/qwen3.8-27b:free
OPENROUTER_MODEL_BACKUP=google/gemma-4-31b-it:free
```

**Rule:** nothing prefixed for client exposure (no `NEXT_PUBLIC_` prefix) should touch Supabase service-role keys or the OpenRouter key. If the client needs a Supabase anon key for some read-only public data later, that would be a separate, explicitly public-safe key — not needed for v1 since all data is private per-user.

---

## 4. Error Handling Conventions

- Server Actions return a consistent shape: `{ success: true, data } | { success: false, error: string }` — never throw raw errors across the server/client boundary, since stack traces shouldn't reach the browser.
- Auth errors are intentionally generic (see `architecture.md §4.2`, `§4.3`) to avoid leaking which part of a credential was wrong.
- Database constraint violations (e.g., duplicate username) are caught and translated to friendly messages, not surfaced as raw Postgres errors.
- AI agent failures (both models down) surface a friendly, non-technical message in the chat UI, not a stack trace or raw HTTP status.
- All server-side errors are logged (console in v1; consider a hosted logging service later) with enough context to debug (route/action name, user_id if available, timestamp) but never logging raw passwords, password hashes, or birth dates.

---

## 5. Validation

- Use a schema validation library (e.g., Zod) at the boundary of every Server Action — validate shape and constraints (username length/charset, password minimum length, valid date for birth date, habit name non-empty, etc.) before touching the database.
- Client-side form validation mirrors server-side rules for immediate feedback, but server-side validation is the actual source of truth — never trust client validation alone.

---

## 6. Testing Strategy (v1 scope — keep it lean)

- **Unit tests:** streak/completion-rate calculation functions (`lib/streaks.ts`) — these have real logic worth covering (edge cases: no logs yet, gaps, timezone boundaries).
- **Integration tests:** auth flows (signup → login → reset) against a test Supabase instance or a local Postgres with the same migrations.
- **Manual QA checklist** (since full E2E coverage is likely overkill for v1): signup/login/reset happy paths, habit CRUD, log toggling across a month boundary, dashboard renders with zero data and with a full month of data, AI agent fallback (simulate main-model failure by pointing at an invalid model ID temporarily).

---

## 7. Deployment

- **Host:** Vercel, connected to the project's Git repository, auto-deploy on push to `main`.
- **Environment variables:** set in Vercel's project settings, matching `.env.local.example` — double-check none of the server-only secrets are accidentally marked as exposed to the client/edge in a way that leaks them.
- **Database:** Supabase project provisioned separately; run migrations via Supabase's SQL editor or CLI (`supabase db push`) before first deploy.
- **Domain:** default Vercel subdomain is fine for v1; custom domain can be added later without code changes.

---

## 8. Coding Conventions

- TypeScript throughout (Server Actions, components, lib functions) — no untyped `any` for data shapes coming from the database; define types matching `database.md`'s tables.
- Naming: camelCase for functions/variables, PascalCase for components, snake_case only for raw SQL column names (kept at the database boundary, mapped to camelCase in TypeScript types).
- No inline styles for anything covered by the design system (`design.md` tokens) — use Tailwind classes mapped to the CSS variables, so a future palette change is a one-file edit.
- Keep Server Actions small and single-purpose; put shared logic (streak math, AI prompt building) in `lib/`, not duplicated across actions.

---

## 9. Known Constraints Carried Over From Earlier Decisions

- No OTP/email verification anywhere — reset relies on username + birth date (see `architecture.md §4.3` for the accepted security tradeoff and the rate-limiting mitigation).
- OpenRouter free-tier models rotate and have request caps — confirm exact model IDs before final wiring, and keep the two-model fallback pattern extensible to a third model if needed later without a structural rewrite (the `models` array in `lib/aiAgent.ts` should just be a list, not two hardcoded variables).
