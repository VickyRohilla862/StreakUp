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
- Browser-based account creation and sign-in.

## Important prototype limitations

This is a functional frontend prototype, not yet a production-grade multi-user service.

- Accounts, workspace data, and chat history are stored in the browser. They persist across refreshes on the same device but do not provide secure authentication or cross-device sync.
- AI Coach uses deterministic local rules unless `VITE_AI_API_URL` points to an existing server endpoint. The endpoint receives `{ message, conversation, context, webSearch: true, provider: "google-grounding" }` and must return `{ answer }`. The server should call Gemini with Google Search grounding, enforce authentication and authorization, and never expose provider keys in frontend variables.
- Some weekly charts are illustrative sample data; the analytics screen labels this limitation.
- Habit check-in editing is a prototype interaction; production streak calculations must use dated check-ins, the user's time zone, and idempotent server-side rules.
- Social circles are local-only until membership, invitation, and authorization flows are implemented.
- The current starter score logic is intentionally simple and should be replaced with a server-side score-event ledger before public launch.

## Configure the AI endpoint

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_AI_API_URL` to an HTTPS backend endpoint.
3. Restart the Vite server.

The endpoint receives `{ message, conversation, context, webSearch: true, provider: "google-grounding" }` and must return `{ answer }`. Keep Gemini or other private provider keys on the backend, never in frontend variables.

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

1. Push the repository to GitHub.
2. In the repository, open **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` or run the **Deploy to GitHub Pages** workflow manually.

The published site will be available at `https://VickyRohilla862.github.io/StreakUp/`.

## Suggested next implementation milestones

1. Build a typed data-access layer and connect task/goal/habit/focus CRUD to a backend.
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
- Browser local storage
