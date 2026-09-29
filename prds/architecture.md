# Architecture PRD — Habit Tracker Web App

**Purpose:** This document specifies the application architecture, tech stack, auth flow, AI agent integration, and feature set. Pair it with `database.md`. An AI coding agent should treat both documents together as the complete build spec.

---

## 1. Product Summary

A web-based habit tracker. Users sign up with a username, password, and birth date. They create habits, log daily completion, view progress via graphs/tables, and get help from an integrated AI agent. All visual elements use SVG — no icon fonts.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) | Server Actions/Route Handlers let sensitive logic (password hashing, RLS session var, AI API calls) stay server-side |
| UI | React + Tailwind CSS | Fast iteration, utility-first styling |
| Database | Supabase (PostgreSQL) | Managed Postgres, generous free tier |
| Auth | Custom (not Supabase Auth) | Requirement: username/password only, birth-date reset, no OTP/email |
| Password hashing | bcrypt (`bcryptjs`) | Standard, no native build issues in serverless environments |
| Charts | Recharts or visx | SVG-native, matches "no icon font, vector-only" constraint |
| AI Agent | OpenRouter API | Free-tier model access; supports arbitrary model IDs via one API |
| Hosting | Vercel | First-class Next.js support |

---

## 3. High-Level Architecture

```
┌─────────────────────┐
│   Browser (Client)   │  React components, Tailwind, Recharts
└──────────┬───────────┘
           │ HTTPS
┌──────────▼───────────┐
│  Next.js Server Layer │  Server Actions / Route Handlers
│  - Auth logic         │
│  - Session validation │
│  - RLS session var set│
│  - AI agent proxy     │
└──────────┬───────────┘
           │
  ┌────────┴────────┐
  │                 │
┌─▼─────────┐   ┌───▼─────────────┐
│ Supabase   │   │ OpenRouter API   │
│ (Postgres) │   │ (AI models)      │
└────────────┘   └──────────────────┘
```

**Key principle:** The browser never talks to Supabase or OpenRouter directly. Every database query and every AI call is proxied through a Next.js server-side function. This is required because:
- The `service_role` Supabase key must stay server-only.
- The OpenRouter API key must stay server-only.
- The custom RLS session variable (`app.current_user_id`) must be set per-request on the server before any query runs.

---

## 4. Auth Architecture

### 4.1 Signup Flow

1. Client submits `username`, `password`, `birth_date` to a Server Action.
2. Server checks `lower(username)` uniqueness against `users`.
3. Server hashes `password` and `birth_date` with bcrypt (separate hashes, same or different salt rounds — recommend 10–12 rounds).
4. Server inserts the new row into `users` (using the Supabase service-role client, bypassing RLS intentionally here).
5. Server creates a session (see §4.4) and returns success.

### 4.2 Login Flow

1. Client submits `username`, `password`.
2. Server looks up user by `lower(username)`.
3. Server compares `password` against `password_hash` with bcrypt.
4. On success, issue a session (§4.4). On failure, return a generic "invalid username or password" error — do not reveal which field was wrong.

### 4.3 Password Reset Flow (no OTP)

1. **Step 1:** Client submits `username`. Server checks existence but does **not** reveal whether it exists — always proceeds to step 2's UI regardless, to avoid username enumeration.
2. **Step 2:** Client submits `birth_date`. Server hashes it and compares to `birth_date_hash` for that username.
   - If username doesn't exist, or birth date doesn't match: return the same generic error either way ("The information provided doesn't match our records").
3. **Step 3:** Only if step 2 succeeds, show a "set new password" form. Issue a short-lived, single-use server-side reset token (e.g., stored in a server memory/Redis/Supabase table with a 5–10 minute expiry) so the client can't skip straight to step 3 without passing step 2.
4. Client submits new password with the reset token. Server validates the token, hashes the new password, updates `users.password_hash`.

**Security note carried over from earlier discussion:** username + birth date is inherently weaker than email/OTP verification, since birth dates have limited entropy (~365×~80 possible values) and may be guessable/knowable by acquaintances. This was a deliberate product tradeoff to avoid OTP infrastructure. Rate-limiting the reset endpoint (e.g., 5 attempts per hour per username) is strongly recommended to reduce brute-force risk, and should be built in v1, not deferred.

### 4.4 Session Management

- On successful login/signup, issue a signed, httpOnly, secure cookie containing a session token (JWT signed with a server-only secret, or an opaque token mapped to `user_id` in a `sessions` table — either is acceptable; JWT is simpler for v1).
- JWT payload: `{ user_id, issued_at, expires_at }`. Expiry suggestion: 7–30 days with refresh-on-use.
- Every server-side data function starts with:
  1. Read/verify the session cookie.
  2. Extract `user_id`.
  3. Open a Postgres connection/transaction and run `select set_config('app.current_user_id', $1, true)`.
  4. Run the actual query — RLS now scopes it automatically.

---

## 5. Feature Modules

### 5.1 Home
- Fetch today's habits + today's `habit_logs` rows for the current user.
- Toggle completion → upsert into `habit_logs` (unique on `habit_id, log_date`).
- Display current streak per habit (computed server-side, see database.md §4).
- Display a completion-percentage ring as inline SVG (no chart library needed for this one — simple enough to hand-draw with `<circle>` + `stroke-dasharray`).
- Small AI Agent tip card: server pre-fetches one short AI-generated tip on page load (see §6).

### 5.2 Dashboard
- Weekly/monthly aggregate query on `habit_logs` grouped by date.
- Render with Recharts: bar chart (weekly), line chart (monthly trend).
- Heatmap: custom SVG grid, one `<rect>` per day, color intensity by completion.
- Per-habit success-rate donut (Recharts `PieChart` with two segments, or hand-drawn SVG arc).
- Sortable table of all habits ranked by current streak.

### 5.3 Add Habit
- Form: name, category, frequency type (daily / specific days / times-per-week), goal type (checkbox / quantity + unit), color picker, SVG icon picker, optional reminder time.
- On submit: insert into `habits`.
- Reminder time, if set, registers a browser Notification (requires user permission grant — handle gracefully if denied).

### 5.4 Track Habit
- Route: `/track/[habitId]`.
- Month calendar view: for each day, look up whether a `habit_logs` row exists and its `completed_value`.
- Clicking any past (or present) day opens an inline editor to set/unset completion and add a note — this is an upsert on `habit_logs`.
- Table view beneath the calendar: date, status, note, sortable/filterable by completion status.

### 5.5 Settings
- Change username (re-check uniqueness), change password (require current password), theme toggle (persisted via cookie or `localStorage`), data export (query all `habits` + `habit_logs` for the user, serialize to JSON/CSV, serve as a download), AI agent tone/verbosity preference (stored per-user, e.g., a `preferences jsonb` column on `users` if needed later), delete account (cascades via FK `on delete cascade`).

---

## 6. AI Agent Integration

### 6.1 Models & Fallback

- Main model: `qwen/qwen3.8-27b:free`
- Backup model: `google/gemma-4-31b-it:free`
- **Verify exact model IDs on openrouter.ai/models before wiring this up** — free-tier model IDs and availability change over time, and a stale ID will silently 404.

### 6.2 Server-Side Proxy Function

All AI calls go through one server function (Route Handler, e.g. `POST /api/ai-agent`):

1. Authenticate the request via session cookie → `user_id`.
2. Fetch recent relevant habit data for that user (last 7–30 days of `habit_logs`, streak summary) to include as context.
3. Build the messages array: `[system_prompt, ...recent ai_agent_logs for context, user_message]`.
4. Call OpenRouter with the main model; on non-2xx response or timeout, retry once against the backup model.
5. Store both the user message and the assistant reply in `ai_agent_logs`.
6. Return the reply to the client.

```js
// pseudocode — see also the fallback snippet already agreed on in chat
async function callAIAgent(userId, userMessage) {
  const habitContext = await getRecentHabitSummary(userId); // server-side query
  const systemPrompt = buildSystemPrompt(habitContext);
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];

  const models = ["qwen/qwen3.8-27b:free", "google/gemma-4-31b-it:free"];
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model, messages, max_tokens: 500 })
      });
      if (!res.ok) throw new Error(`${model} failed: ${res.status}`);
      const data = await res.json();
      await logAIInteraction(userId, userMessage, data.choices[0].message.content, model);
      return data.choices[0].message.content;
    } catch (err) {
      console.error(err);
      continue;
    }
  }
  throw new Error("Both models unavailable");
}
```

### 6.3 System Prompt

(Same one already agreed on in chat — kept here for completeness so this doc is self-contained.)

```
তুমি একজন সহায়ক হ্যাবিট-কোচ AI, যে এই হ্যাবিট ট্র্যাকার অ্যাপে ইন্টিগ্রেটেড।

তোমার ভূমিকা:
- ইউজারের হ্যাবিট ডেটা (স্ট্রিক, completion rate, মিসড দিন, প্যাটার্ন) বিশ্লেষণ করে সংক্ষিপ্ত, কার্যকর পরামর্শ দাও
- মোটিভেশনাল কিন্তু বাস্তবসম্মত হও — অতিরিক্ত উচ্ছ্বসিত বা গিল্ট-ট্রিপিং কোনোটাই না
- ইউজার প্রশ্ন করলে তার নিজের ডেটার প্রেক্ষিতে উত্তর দাও, জেনেরিক উপদেশ না
- উত্তর সংক্ষিপ্ত রাখো (২-৪ বাক্য), যদি না ইউজার বিস্তারিত চায়
- ইউজার যে ভাষায় লিখবে (বাংলা বা ইংরেজি), সেই ভাষায় উত্তর দাও
- তুমি মেডিকেল, মানসিক স্বাস্থ্য, বা আর্থিক পরামর্শ দেবে না — শুধু হ্যাবিট-ট্র্যাকিং সংক্রান্ত সহায়তা দাও
- ইউজারের ডেটার বাইরে কিছু অনুমান করবে না বা বানিয়ে বলবে না

প্রতিটা রিকোয়েস্টের সাথে ইউজারের সাম্প্রতিক হ্যাবিট ডেটা (JSON আকারে) পাঠানো হবে — সেই ডেটার ভিত্তিতেই উত্তর দাও।
```

### 6.4 Rate Limiting

OpenRouter's free tier has request-per-minute and per-day caps that vary by account status. Add basic client-side debouncing on the chat UI and a server-side per-user rate limit (e.g., max 20 AI calls/hour) to avoid one user exhausting the shared quota.

---

## 7. Design System

- Primary: `#2E7D6B`
- Accent: `#F4A259`
- Background (light): `#FAFAF7` / (dark): `#121714`
- Missed state: `#E0DED9` (neutral, not red — avoids guilt-tripping)
- Text primary: `#1C2620` / secondary: `#6B7A72`
- All icons: hand-authored SVG, consistent ~1.5dp-equivalent stroke width, consistent corner radius.

---

## 8. Build Order (Recommended)

1. Next.js project scaffold + Tailwind setup
2. Supabase project + run migrations from `database.md`
3. Auth: signup, login, session cookie, middleware to protect routes
4. Password reset flow (username → birth date → new password), with rate limiting
5. Habits CRUD (Add Habit page + server actions)
6. Home page (today's checklist + streak + completion ring)
7. Track Habit page (calendar + table)
8. Dashboard (charts + heatmap)
9. Settings page
10. AI Agent integration (proxy route, fallback logic, chat UI, tip card on Home)
11. Data export
12. Polish, responsive check, deploy to Vercel

---

## 9. Non-Goals (v1)

- No OTP/email verification anywhere (explicit product decision).
- No social/multi-device real-time sync beyond normal request/response (no websockets needed for v1).
- No native mobile app — web-only, responsive design covers mobile browser use.
- No payment/subscription system.
