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
- Account settings for editing the display name, requesting email changes, signing out, and deleting the local account.
- Google Sign-In entry flow using Google Identity Services.

## Important prototype limitations

This is a functional frontend prototype, not yet a production-grade multi-user service.

- Accounts, workspace data, and chat history are stored in the browser. They persist across refreshes on the same device but do not provide secure authentication or cross-device sync.
- Email and account identity are managed by Google; there is no local password or OTP flow.
- AI Coach uses Google Gemini directly from the browser. Each signed-in user is asked for a Google AI Studio API key the first time they open the chat. The key is stored in that browser's `localStorage` and is sent directly to Google's Gemini API. This is convenient for a prototype but is not a secure production key-management approach.
- Some weekly charts are illustrative sample data; the analytics screen labels this limitation.
- Habit check-in editing is a prototype interaction; production streak calculations must use dated check-ins, the user's time zone, and idempotent server-side rules.
- Social circles are local-only until membership, invitation, and authorization flows are implemented.
- The current starter score logic is intentionally simple and should be replaced with a server-side score-event ledger before public launch.

## Configure Google Gemini for the AI Coach

The user-facing setup flow can configure Google Gemini, Groq, OpenRouter, Tavily Search, and YouTube Data API keys. The router tries Gemini, then Groq, then OpenRouter. Tavily and YouTube are optional resource providers used for current links, images, and videos when a prompt benefits from them. This is a browser-side prototype; move keys behind a backend before public launch.

To use a different Gemini model, optionally set `VITE_GEMINI_MODEL` in `.env.local` and restart the Vite server. For production, replace browser-side key storage with an authenticated backend proxy, server-side secret storage, usage limits, and key rotation.

## Configure Google Sign-In

1. In Google Cloud Console, create an OAuth 2.0 **Web application** client.
2. Add `https://VickyRohilla862.github.io` to Authorized JavaScript origins.
3. Add the local development origin, usually `http://localhost:5173`.
4. Create a GitHub repository variable named `VITE_GOOGLE_CLIENT_ID` with the
   client ID under **Settings → Secrets and variables → Actions → Variables**.
   A repository Actions secret with the same name also works.
5. Redeploy the GitHub Pages workflow.

The Google Identity Services script is loaded in `index.html`. The frontend
uses the Google credential to establish the prototype session. For a
production multi-user app, send the credential to a backend and verify the
Google token server-side before issuing an application session.

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
