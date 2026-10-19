# StreakUp — Student Productivity Web App

A dark-premium React prototype for student productivity: tasks, goals, habit streaks, XP, focus timer, AI-coach UI, analytics, accountability circles, challenges, settings, and account screens.

## Quick start

Requirements: Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL Vite prints in the terminal.

## What works in this prototype

- Responsive dark UI with sidebar navigation and mobile menu.
- Create, search, and complete tasks; create goals and update goal progress.
- Create habits and record weekly check-ins.
- Local persistence using `localStorage`.
- XP and basic consistency-score changes for task completion.
- Focus timer with focus/break modes and session logging.
- Persistent AI coach conversations with new chat, pin, delete, and typewriter responses.
- Weekly and summary analytics screens.
- Local prototype circles and weekly challenges.
- Settings and workspace clearing.
- Required account creation/sign-in screen before entering the workspace.
- Optional Supabase email/password auth integration when environment variables are configured.

## Important prototype limitations

This is a functional frontend prototype, not yet a production-grade multi-user service.

- Without Supabase credentials, the required sign-in form uses browser-only demo accounts. These accounts persist across refreshes but do not provide secure authentication or cross-device sync. Data is saved only in that browser.
- With Supabase configured, authentication works, but this starter does **not yet wire every UI task, goal, habit, score, and social action to database CRUD**. The SQL schema is included as the next integration step.
- AI Coach uses deterministic local rules unless `VITE_AI_API_URL` points to an existing server endpoint. The endpoint receives `{ message, conversation, context, webSearch: true, provider: "google-grounding" }` and must return `{ answer }`. The server should call Gemini with Google Search grounding, enforce authentication and authorization, and never expose provider keys in frontend variables.
- Some weekly charts are illustrative sample data; the analytics screen labels this limitation.
- Habit check-in editing is a prototype interaction; production streak calculations must use dated check-ins, the user's time zone, and idempotent server-side rules.
- Social circles are local-only until membership, invitation, and authorization flows are implemented.
- The current starter score logic is intentionally simple and should be replaced with a server-side score-event ledger before public launch.

## Configure Supabase authentication

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. In Supabase Auth, configure email sign-in and allowed redirect URLs.
5. Run `supabase/schema.sql` in the Supabase SQL Editor.
6. Restart the Vite server.

Only the Supabase anon/public key belongs in frontend configuration. Never put a service-role key or private AI provider key in the browser.

## Suggested next implementation milestones

1. Build a typed data-access layer and connect task/goal/habit/focus CRUD to Supabase.
2. Implement date-based recurring tasks and timezone-aware streak calculations.
3. Move score changes into an idempotent server-side ledger with audit events.
4. Add private circle invitations, membership policies, challenges, and opt-in leaderboards.
5. Add a server-side AI coach endpoint with prompt-injection protection, rate limits, privacy disclosure, and grounded outputs.
6. Add automated tests for scoring, recurring dates, streak recovery, and authorization.
7. Deploy frontend to Vercel and configure production auth redirects.

## Stack

- React + Vite
- Lucide React
- Recharts
- Optional Supabase Auth
- Supabase/Postgres schema starter
