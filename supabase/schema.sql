-- StreakUp schema starter for Supabase.
-- Run in Supabase SQL Editor after creating a project.
-- Row Level Security is enabled on every user-owned table.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  xp integer not null default 0 check (xp >= 0),
  consistency_score integer not null default 50 check (consistency_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Study',
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  estimated_minutes integer not null default 0 check (estimated_minutes between 1 and 1440),
  recurrence text not null default 'None' check (recurrence in ('None','Daily','Weekly','Monthly')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Learning',
  horizon text not null default 'Monthly' check (horizon in ('Weekly','Monthly','Yearly')),
  target text not null default '',
  progress integer not null default 0 check (progress between 0 and 100),
  deadline date,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Learning',
  created_at timestamptz not null default now()
);

create table if not exists public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  checkin_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (habit_id, checkin_date)
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  duration_minutes integer not null check (duration_minutes > 0),
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  points integer not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.accountability_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.accountability_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  circle_id uuid references public.accountability_circles(id) on delete cascade,
  title text not null,
  starts_on date not null default current_date,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.goals enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.score_events enable row level security;
alter table public.accountability_circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

create policy "Profiles are readable by owner" on public.profiles for select using (auth.uid() = id);
create policy "Profiles are insertable by owner" on public.profiles for insert with check (auth.uid() = id);
create policy "Profiles are updatable by owner" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Own tasks all operations" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own goals all operations" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own habits all operations" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own checkins all operations" on public.habit_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own focus sessions all operations" on public.focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own score events all operations" on public.score_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Circle visibility: owners and members can read the circles they belong to.
create policy "Circle owner manages circle" on public.accountability_circles for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Members can read their circles" on public.accountability_circles for select using (
  exists (select 1 from public.circle_members cm where cm.circle_id = id and cm.user_id = auth.uid())
);
create policy "Users can read their own memberships" on public.circle_members for select using (auth.uid() = user_id);
create policy "Circle owner can manage memberships" on public.circle_members for all using (
  exists (select 1 from public.accountability_circles c where c.id = circle_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.accountability_circles c where c.id = circle_id and c.owner_id = auth.uid())
);
create policy "Challenge creator manages challenge" on public.challenges for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);
create policy "Challenge participants can read challenge" on public.challenges for select using (
  exists (select 1 from public.challenge_members cm where cm.challenge_id = id and cm.user_id = auth.uid())
);
create policy "Users can read own challenge memberships" on public.challenge_members for select using (auth.uid() = user_id);
create policy "Challenge creator manages participants" on public.challenge_members for all using (
  exists (select 1 from public.challenges c where c.id = challenge_id and c.creator_id = auth.uid())
) with check (
  exists (select 1 from public.challenges c where c.id = challenge_id and c.creator_id = auth.uid())
);

-- Auth user profile bootstrap.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
