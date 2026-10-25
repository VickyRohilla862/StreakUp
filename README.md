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
- Supabase-backed accountability groups with invite links, shared tasks, per-user completion XP, and realtime chat when configured.
- Settings and workspace clearing.
- Required account creation/sign-in screen before entering the workspace.
- Browser-based account creation and sign-in.
- Supabase Auth and cloud workspace sync when Supabase environment variables are configured.
- Account settings for editing the display name, requesting email changes, signing out, and deleting the local account.
- Google Sign-In entry flow using Google Identity Services.

## Important prototype limitations

This is a functional frontend prototype with optional Supabase-backed cloud sync.

- Without Supabase variables, accounts, workspace data, and chat history use browser storage only. With Supabase configured, authenticated workspace data and chat history sync across devices.
- Email and account identity are managed by Google; there is no local password or OTP flow.
- AI Coach uses Google Gemini directly from the browser. Each signed-in user is asked for a Google AI Studio API key the first time they open the chat. The key is stored in that browser's `localStorage` and is sent directly to Google's Gemini API. This is convenient for a prototype but is not a secure production key-management approach.
- Some weekly charts are illustrative sample data; the analytics screen labels this limitation.
- Habit check-in editing is a prototype interaction; production streak calculations must use dated check-ins, the user's time zone, and idempotent server-side rules.
- Accountability requires the Supabase group schema and Realtime tables described below.
- The current starter score logic is intentionally simple and should be replaced with a server-side score-event ledger before public launch.

## Configure Google Gemini for the AI Coach

The user-facing setup flow can configure Google Gemini, Groq, OpenRouter, Tavily Search, and YouTube Data API keys. The router tries Gemini, then Groq, then OpenRouter. Tavily and YouTube are optional resource providers used for current links, images, and videos when a prompt benefits from them. This is a browser-side prototype; move keys behind a backend before public launch.

To use a different Gemini model, optionally set `VITE_GEMINI_MODEL` in `.env.local` and restart the Vite server. For production, replace browser-side key storage with an authenticated backend proxy, server-side secret storage, usage limits, and key rotation.

## Configure Google Sign-In

## Connect Supabase for authentication and device sync

1. Create a project at [supabase.com](https://supabase.com/) and open its SQL Editor.
2. Run this SQL. If you already created `workspace_state`, skip its statement and run the `profiles` section:

```sql
create table if not exists public.workspace_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete their profile" on public.profiles;
create policy "Users can delete their profile"
on public.profiles for delete
using (auth.uid() = id);

alter table public.workspace_state enable row level security;

drop policy if exists "Users can read their workspace" on public.workspace_state;
create policy "Users can read their workspace"
on public.workspace_state for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their workspace" on public.workspace_state;
create policy "Users can insert their workspace"
on public.workspace_state for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their workspace" on public.workspace_state;
create policy "Users can update their workspace"
on public.workspace_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

If Supabase reports `relation "workspace_state" already exists`, that is expected. The workspace table is already set up; do not run its `create table` statement again. Run only the `profiles` table statement, `alter table public.profiles enable row level security`, and the four profile policies. The username field accepts an optional `@` and removes it before saving.

3. In Supabase, open **Authentication → Providers → Google**, enable Google, and add your Google OAuth client ID and secret. In Google Cloud Console, add this Supabase callback URL as an authorized redirect URI:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   Add these application URLs as authorized JavaScript origins:
   - `http://localhost:5173`
   - Your deployed URL, such as `https://your-name.github.io`
4. In **Project Settings → API**, copy the Project URL and the **anon public** key.
5. Add these values to `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

6. In Supabase **Authentication → URL Configuration**, set the Site URL to the full app URL, including the GitHub Pages path:

```text
https://VickyRohilla862.github.io/StreakUp/
```

Add these exact Redirect URLs:

```text
http://localhost:5173/StreakUp/
https://VickyRohilla862.github.io/StreakUp/
```

Do not enter the GitHub URL after the Supabase project URL. The Supabase project URL is only used for `VITE_SUPABASE_URL`; it is not the app redirect URL.
7. Restart Vite with `npm run dev`.

When Supabase variables are present, StreakUp uses Supabase Google OAuth instead of the prototype browser-only sign-in. On the first sign-in, existing local tasks and chat history are uploaded to the new workspace row. Later changes are automatically synced, and signing in on another device loads the same workspace.

After authentication, every user must choose a unique username. Usernames are normalized to lowercase, may contain 3–20 letters or numbers, and may optionally include underscores. Existing accounts without a profile are shown the username setup dialog before they can continue.

### Enable accountability groups

Run this SQL after the profile/workspace SQL above:

> The workspace/profile SQL does **not** create the accountability tables. You must run this entire section separately. The app requires all five tables, not only `group_members`.

```sql
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  username text not null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  xp integer not null default 10 check (xp > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.group_task_completions (
  task_id uuid references public.group_tasks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table if not exists public.group_messages (
  id bigint generated by default as identity primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_tasks enable row level security;
alter table public.group_task_completions enable row level security;
alter table public.group_messages enable row level security;

create or replace function public.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.group_members where group_id = target_group and user_id = auth.uid()) $$;

create policy "Members can read groups" on public.groups for select using (public.is_group_member(id) or owner_id = auth.uid());
create policy "Users can create groups" on public.groups for insert with check (owner_id = auth.uid());
create policy "Owners can update groups" on public.groups for update using (owner_id = auth.uid());
create policy "Members can read memberships" on public.group_members for select using (public.is_group_member(group_id) or user_id = auth.uid());
create policy "Users can join groups" on public.group_members for insert with check (user_id = auth.uid());
create policy "Members can read tasks" on public.group_tasks for select using (public.is_group_member(group_id));
create policy "Members can create tasks" on public.group_tasks for insert with check (public.is_group_member(group_id) and created_by = auth.uid());
create policy "Members can read completions" on public.group_task_completions for select using (public.is_group_member((select group_id from public.group_tasks where id = task_id)));
create policy "Users can complete tasks" on public.group_task_completions for insert with check (user_id = auth.uid() and public.is_group_member((select group_id from public.group_tasks where id = task_id)));
create policy "Members can read messages" on public.group_messages for select using (public.is_group_member(group_id));
create policy "Members can send messages" on public.group_messages for insert with check (user_id = auth.uid() and public.is_group_member(group_id));

create or replace function public.join_group_by_invite(target_token uuid, target_username text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups;
begin
  select * into target_group from public.groups where invite_token = target_token;
  if target_group.id is null then
    raise exception 'Invalid invite link';
  end if;
  insert into public.group_members (group_id, user_id, username)
  values (target_group.id, auth.uid(), target_username)
  on conflict (group_id, user_id) do update set username = excluded.username;
  return target_group;
end;
$$;

grant execute on function public.join_group_by_invite(uuid, text) to authenticated;

alter table public.group_tasks replica identity full;
alter table public.group_messages replica identity full;
alter table public.group_members replica identity full;
```

In Supabase, open **Database → Replication** and enable realtime for `group_tasks`, `group_task_completions`, `group_messages`, and `group_members`. The Accountability page then supports group creation, invite links, shared tasks, per-user completion XP, and realtime chat.

Never put a Supabase service-role key in `VITE_*` variables. The anon key is intended for the browser and is safe only when Row Level Security policies are enabled.

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
