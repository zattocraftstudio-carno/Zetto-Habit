# Polishing & Testing PRD — Habit Tracker Web App

**Purpose:** This is the final-phase document, meant to be used after all features from `architecture.md`, `database.md`, and `design.md` are implemented. It defines what "done" means before deploy — the QA checklist, edge cases, cross-device coverage, performance/accessibility passes, and final polish items. Pair with `technical-document.md §6` (testing strategy), which this document expands into an actionable checklist.

---

## 1. When This Phase Starts

Only after: auth (signup/login/reset), habit CRUD, Home, Dashboard, Track Habit, Settings, and AI Agent integration are all functionally working end to end. This phase is not about building new features — it's about making the existing ones correct, robust, and pleasant.

---

## 2. Functional QA Checklist

### 2.1 Auth
- [ ] Sign up with a new username/password/birth date succeeds and logs the user in.
- [ ] Sign up with a duplicate username (any casing — `Carno` vs `carno`) is rejected.
- [ ] Sign up with an empty/too-short password is rejected with a clear inline message.
- [ ] Login with correct credentials succeeds.
- [ ] Login with wrong password shows the generic error (not "wrong password" specifically).
- [ ] Login with a non-existent username shows the same generic error as above.
- [ ] Forgot-password step 1 (username) never reveals whether the username exists.
- [ ] Forgot-password step 2 with correct birth date proceeds to step 3.
- [ ] Forgot-password step 2 with wrong birth date shows the generic error and does not proceed.
- [ ] Reset token expires correctly after its window (test with a short TTL in dev).
- [ ] Repeated failed reset attempts trigger rate limiting (test the configured threshold).
- [ ] Session persists across a page refresh and across a new browser tab.
- [ ] Session expires correctly at its configured lifetime.
- [ ] Logout clears the session and protected pages redirect to login afterward.

### 2.2 Habits (CRUD)
- [ ] Create a checkbox-type habit; appears immediately on Home.
- [ ] Create a quantity-type habit with a target and unit; Home shows correct progress text (e.g., "3/8 glasses").
- [ ] Edit a habit's name/color/icon; changes reflect everywhere it's displayed (Home, Dashboard, Track).
- [ ] Archive a habit; it disappears from Home/Add-flow but its historical logs remain intact and visible if navigated to directly.
- [ ] Frequency types (daily, specific days, times-per-week) each correctly determine which days a habit appears as "due" on Home.

### 2.3 Logging & Streaks
- [ ] Marking a habit complete today updates the streak immediately without a page reload.
- [ ] Un-marking a completed habit correctly decrements/breaks the streak as expected.
- [ ] Editing a past date's log (via Track Habit) recalculates streaks correctly, including cases where it fills a gap or creates one.
- [ ] A habit with zero logs shows 0% / no streak gracefully, not an error or `NaN`.
- [ ] Logging exactly at a day boundary (e.g., 11:58 PM to 12:02 AM local time) records against the correct calendar date — this is the timezone edge case flagged in `database.md §7`; verify explicitly rather than assuming it's fine.
- [ ] Quantity-type habit: logging a partial value (e.g., 3 of 8) does not count as "complete" for streak purposes unless it meets/exceeds the target — confirm this matches the intended product behavior before shipping.

### 2.4 Dashboard
- [ ] Weekly and monthly charts render correctly with a full month of data.
- [ ] Charts render a sensible empty state with zero logged data (no broken axes, no crash).
- [ ] Heatmap correctly reflects completion intensity per day and matches the underlying log data (spot-check a few cells against Track Habit's calendar for the same habit).
- [ ] Per-habit success-rate donut updates correctly after new logs are added.
- [ ] Habit ranking table sorts correctly by streak, and ties are handled consistently (e.g., secondary sort by habit name).

### 2.5 Track Habit
- [ ] Calendar correctly shows completed/missed/future/today states as specified in `design.md §6.6`.
- [ ] Clicking a future date does not allow logging (habits can't be marked done in advance) — confirm this is the intended rule and enforce it server-side, not just hidden in the UI.
- [ ] Notes save correctly and persist on reload.
- [ ] Table view's sort/filter controls work and match the calendar's data.

### 2.6 Settings
- [ ] Username change re-checks uniqueness and rejects duplicates.
- [ ] Password change requires the current password and rejects an incorrect one.
- [ ] Theme toggle persists across sessions (reload, new tab, next day).
- [ ] Data export produces a valid, complete JSON/CSV containing all of the user's habits and logs — spot-check the exported file against the database.
- [ ] Account deletion actually cascades (habits and logs are gone, not just the user row) — verify directly in the database, not just in the UI.

### 2.7 AI Agent
- [ ] A normal chat message gets a relevant reply referencing the user's actual habit data (not generic filler).
- [ ] Force the main model to fail (temporarily point `OPENROUTER_MODEL_MAIN` at an invalid ID) and confirm the backup model serves the response transparently.
- [ ] Force both models to fail and confirm the friendly error message appears — no stack trace, no raw HTTP error, in the chat UI.
- [ ] Per-user rate limiting on AI calls actually triggers past the configured threshold.
- [ ] Chat history (`ai_agent_logs`) persists and is scoped correctly per user (User A never sees User B's AI conversation).
- [ ] The Home page tip card loads independently of the full chat panel and doesn't block Home's initial render if the AI call is slow.

---

## 3. Security Pass

- [ ] Confirm RLS is actually enforced: attempt a direct query as one user for another user's `habit_id`/data and verify it returns nothing (test this against the real Supabase instance, not just by trusting the policy definitions).
- [ ] Confirm `service_role` key and `OPENROUTER_API_KEY` never appear in any client-side bundle (grep the built `.next` output for the key strings as a sanity check).
- [ ] Confirm password and birth date are never logged anywhere (console, error logs, `ai_agent_logs`).
- [ ] Confirm the reset flow's generic error message is truly identical (same text, same response time — watch out for timing differences that leak whether a username exists) for "user doesn't exist" vs. "user exists but birth date wrong."
- [ ] Confirm session cookies are `httpOnly`, `secure`, and `sameSite` appropriately set before deploy.

---

## 4. Cross-Browser & Device Coverage

| Target | Priority | Notes |
|---|---|---|
| Chrome (desktop) | Must | Primary dev browser, test first |
| Chrome (Android) | Must | Likely the user's own primary usage context |
| Safari (iOS) | Should | Check date/time input rendering, which differs from Chrome |
| Firefox (desktop) | Should | Check SVG rendering and chart interactions |
| Safari (desktop) | Nice to have | Lower priority given the stated user base |

Test at minimum: 360px width (small phone), 768px (tablet), 1280px+ (desktop) — matching the breakpoints in `design.md §8`.

---

## 5. Performance Pass

- [ ] Home page initial load feels instant (<1s perceived) for a user with a realistic number of habits (test with ~15–20 habits, not just 2–3).
- [ ] Dashboard aggregate queries stay fast as `habit_logs` grows — test with a seeded dataset of a full year of daily logs across several habits, not just a few days.
- [ ] Images/SVGs are optimized (no unnecessarily large inline SVG markup bloating page weight).
- [ ] No unnecessary client-side re-fetching — verify Server Actions/React Server Components are used where possible instead of redundant client `useEffect` fetches.
- [ ] AI agent response time is reasonable; if the free-tier model is slow, confirm the loading state (design.md §6.8) actually shows during the wait rather than a frozen UI.

---

## 6. Accessibility Pass

- [ ] Keyboard-only navigation: complete the full signup → add habit → log a day → view dashboard flow using only Tab/Enter/Arrow keys, no mouse.
- [ ] Screen reader spot-check (e.g., VoiceOver or a browser extension): habit checklist items, streak badges, and chart summaries announce meaningfully, not just as unlabeled SVGs.
- [ ] Color contrast check (automated, e.g., via browser devtools or an axe scan) passes WCAG AA in both light and dark themes.
- [ ] All form inputs have associated labels (not just placeholder text standing in for a label).

---

## 7. Visual Polish Pass

- [ ] Consistent spacing/alignment across all 5 pages — no one-off margins that don't match the `design.md §4` spacing scale.
- [ ] Icon set is visually consistent (same stroke width, same corner treatment) across every screen — do a side-by-side visual audit of all icons at once.
- [ ] Empty states (§design.md §7) are actually implemented for every list/chart, not just Home.
- [ ] Loading skeletons appear consistently wherever data is fetched, not just on some pages.
- [ ] Dark mode has been visually reviewed page-by-page, not just spot-checked — some component (e.g., a chart gridline or a badge) is often missed and stays light-mode-only by accident.
- [ ] Toast/notification styling matches `design.md §7` (auto-dismiss timing, positioning) consistently across success and error cases.

---

## 8. Content & Copy Pass

- [ ] All user-facing text reviewed for tone consistency (calm/encouraging per `design.md §1`) — no leftover placeholder/lorem-ipsum text.
- [ ] Error messages are specific enough to be helpful but never leak sensitive detail (per §3 above).
- [ ] If both Bengali and English copy exist, verify neither language has untranslated fallback strings showing through.

---

## 9. Pre-Deploy Checklist

- [ ] All environment variables set correctly in Vercel (not just `.env.local`).
- [ ] Supabase migrations applied to the production project, matching `database.md` exactly (diff against the migration files, don't assume).
- [ ] RLS enabled and verified on the production database specifically (not just the local/dev instance).
- [ ] A real signup → login → full happy-path walkthrough performed against the deployed production URL, not just localhost.
- [ ] Rollback plan understood: know how to revert a Vercel deploy if something breaks post-launch.

---

## 10. Post-Launch Watch List (first week)

- Monitor OpenRouter usage against free-tier rate limits — confirm the fallback and per-user rate limiting are actually preventing quota exhaustion in real usage, not just in testing.
- Watch for any RLS-related errors in logs (would indicate the `set_config` session variable isn't being set correctly on some code path).
- Watch for reset-flow abuse attempts (repeated failed birth-date guesses) — confirm rate limiting is holding up under real traffic, not just the test scenario.
