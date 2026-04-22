-- ============================================================
-- boardgame-league — initial schema + RLS policies for Supabase
-- Run in Supabase SQL Editor (one-shot).
-- ============================================================

-- Extensions -------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- Tables (10)
-- ============================================================

-- 1) players -------------------------------------------------
create table if not exists public.players (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,   -- human-readable ID (영문/숫자/_/-)
  email         text not null unique,   -- internal: {username}@bgm.local
  nickname      text not null unique,   -- display name (defaults to username)
  avatar_url    text,
  bio           text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2) leagues -------------------------------------------------
create table if not exists public.leagues (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  slug              text not null unique,
  owner_id          uuid not null references public.players(id) on delete restrict,
  default_game_id   uuid,
  elo_k             integer not null default 32,
  is_public         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 3) league_memberships --------------------------------------
create table if not exists public.league_memberships (
  id          uuid primary key default uuid_generate_v4(),
  league_id   uuid not null references public.leagues(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  role        text not null check (role in ('owner','manager','player')),
  joined_at   timestamptz not null default now(),
  unique (league_id, player_id)
);
create index if not exists idx_lm_league on public.league_memberships(league_id);
create index if not exists idx_lm_player on public.league_memberships(player_id);

-- 4) seasons -------------------------------------------------
create table if not exists public.seasons (
  id          uuid primary key default uuid_generate_v4(),
  league_id   uuid not null references public.leagues(id) on delete cascade,
  name        text not null,
  number      integer not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  status      text not null default 'upcoming' check (status in ('upcoming','active','closed')),
  unique (league_id, number)
);

-- 5) games ---------------------------------------------------
create table if not exists public.games (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null unique,
  min_players    integer not null default 2,
  max_players    integer not null default 2,
  supports_draw  boolean not null default true
);

-- 6) matches -------------------------------------------------
create table if not exists public.matches (
  id             uuid primary key default uuid_generate_v4(),
  season_id      uuid not null references public.seasons(id) on delete cascade,
  game_id        uuid not null references public.games(id),
  played_at      timestamptz not null default now(),
  player_a_id    uuid not null references public.players(id),
  player_b_id    uuid not null references public.players(id),
  winner_id      uuid references public.players(id),
  loser_id       uuid references public.players(id),
  result         text not null check (result in ('a_win','b_win','draw')),
  elo_change_a   integer not null default 0,
  elo_change_b   integer not null default 0,
  created_by     uuid not null references public.players(id),
  created_at     timestamptz not null default now(),
  check (player_a_id <> player_b_id)
);
create index if not exists idx_match_season on public.matches(season_id, played_at desc);

-- 7) rounds --------------------------------------------------
create table if not exists public.rounds (
  id          uuid primary key default uuid_generate_v4(),
  season_id   uuid not null references public.seasons(id) on delete cascade,
  number      integer not null,
  name        text not null,
  unique (season_id, number)
);

-- 8) brackets ------------------------------------------------
create table if not exists public.brackets (
  id             uuid primary key default uuid_generate_v4(),
  round_id       uuid not null references public.rounds(id) on delete cascade,
  player_a_id    uuid not null references public.players(id),
  player_b_id    uuid not null references public.players(id),
  scheduled_at   timestamptz,
  status         text not null default 'open' check (status in ('open','scheduled','played','cancelled')),
  match_id       uuid references public.matches(id),
  check (player_a_id <> player_b_id)
);

-- 9) match_participations ------------------------------------
create table if not exists public.match_participations (
  id          uuid primary key default uuid_generate_v4(),
  bracket_id  uuid not null references public.brackets(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  status      text not null default 'applied' check (status in ('applied','confirmed','declined')),
  unique (bracket_id, player_id)
);

-- 10) ranking_snapshots --------------------------------------
create table if not exists public.ranking_snapshots (
  id          uuid primary key default uuid_generate_v4(),
  season_id   uuid not null references public.seasons(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  rank        integer not null default 0,
  wins        integer not null default 0,
  losses      integer not null default 0,
  draws       integer not null default 0,
  elo         integer not null default 1500,
  win_rate    numeric not null default 0,
  updated_at  timestamptz not null default now(),
  unique (season_id, player_id)
);
create index if not exists idx_ranking_lookup on public.ranking_snapshots(season_id, rank);

-- default_game_id FK (deferred until games table exists)
alter table public.leagues drop constraint if exists leagues_default_game_fk;
alter table public.leagues
  add constraint leagues_default_game_fk
  foreign key (default_game_id) references public.games(id)
  on delete set null
  deferrable initially deferred;

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['players','leagues'] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%s', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s for each row execute function public.set_updated_at()',
      t, t);
  end loop;
end $$;

-- ============================================================
-- Auto-create Player row when a new auth.user signs up
-- (raw_user_meta_data.nickname is expected from signup form)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  _username text;
  _nickname text;
begin
  -- username: from metadata, otherwise extract from fake email (before @bgm.local)
  _username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- nickname: same as username by default (can be updated later in profile)
  _nickname := coalesce(
    new.raw_user_meta_data->>'nickname',
    _username
  );
  insert into public.players (id, username, email, nickname)
  values (new.id, _username, new.email, _nickname)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table public.players              enable row level security;
alter table public.leagues              enable row level security;
alter table public.league_memberships   enable row level security;
alter table public.seasons              enable row level security;
alter table public.games                enable row level security;
alter table public.matches              enable row level security;
alter table public.rounds               enable row level security;
alter table public.brackets             enable row level security;
alter table public.match_participations enable row level security;
alter table public.ranking_snapshots    enable row level security;

-- helper: is caller a member of league with one of the given roles?
create or replace function public.has_league_role(_league uuid, _roles text[])
returns boolean language sql stable as $$
  select exists (
    select 1 from public.league_memberships
    where league_id = _league
      and player_id = auth.uid()
      and role = any(_roles)
  );
$$;

-- players ----------------------------------------------------
drop policy if exists "players_read_public" on public.players;
create policy "players_read_public" on public.players for select using (true);

drop policy if exists "players_update_self" on public.players;
create policy "players_update_self" on public.players for update
  using (id = auth.uid()) with check (id = auth.uid());

-- leagues ----------------------------------------------------
drop policy if exists "leagues_read" on public.leagues;
create policy "leagues_read" on public.leagues for select using (
  is_public = true or public.has_league_role(id, array['owner','manager','player'])
);

drop policy if exists "leagues_insert_self_as_owner" on public.leagues;
create policy "leagues_insert_self_as_owner" on public.leagues for insert
  with check (owner_id = auth.uid());

drop policy if exists "leagues_update_owner" on public.leagues;
create policy "leagues_update_owner" on public.leagues for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- league_memberships -----------------------------------------
drop policy if exists "lm_read_members" on public.league_memberships;
create policy "lm_read_members" on public.league_memberships for select using (
  public.has_league_role(league_id, array['owner','manager','player'])
);

drop policy if exists "lm_write_staff" on public.league_memberships;
create policy "lm_write_staff" on public.league_memberships for all
  using (public.has_league_role(league_id, array['owner','manager']))
  with check (public.has_league_role(league_id, array['owner','manager']));

-- seasons ----------------------------------------------------
drop policy if exists "seasons_read" on public.seasons;
create policy "seasons_read" on public.seasons for select using (
  exists (select 1 from public.leagues l where l.id = seasons.league_id
          and (l.is_public or public.has_league_role(l.id, array['owner','manager','player'])))
);

drop policy if exists "seasons_write_staff" on public.seasons;
create policy "seasons_write_staff" on public.seasons for all
  using (public.has_league_role(league_id, array['owner','manager']))
  with check (public.has_league_role(league_id, array['owner','manager']));

-- games: public catalog --------------------------------------
drop policy if exists "games_read" on public.games;
create policy "games_read" on public.games for select using (true);

drop policy if exists "games_write_authenticated" on public.games;
create policy "games_write_authenticated" on public.games for all to authenticated
  using (true) with check (true);

-- matches ----------------------------------------------------
drop policy if exists "matches_read" on public.matches;
create policy "matches_read" on public.matches for select using (
  exists (
    select 1 from public.seasons s join public.leagues l on l.id = s.league_id
    where s.id = matches.season_id
      and (l.is_public or public.has_league_role(l.id, array['owner','manager','player']))
  )
);

drop policy if exists "matches_insert_staff" on public.matches;
create policy "matches_insert_staff" on public.matches for insert
  with check (
    exists (select 1 from public.seasons s
            where s.id = matches.season_id
              and public.has_league_role(s.league_id, array['owner','manager']))
  );

-- rounds -----------------------------------------------------
drop policy if exists "rounds_read" on public.rounds;
create policy "rounds_read" on public.rounds for select using (
  exists (select 1 from public.seasons s join public.leagues l on l.id = s.league_id
          where s.id = rounds.season_id
            and (l.is_public or public.has_league_role(l.id, array['owner','manager','player'])))
);

drop policy if exists "rounds_write_staff" on public.rounds;
create policy "rounds_write_staff" on public.rounds for all
  using (exists (select 1 from public.seasons s where s.id = rounds.season_id
                 and public.has_league_role(s.league_id, array['owner','manager'])))
  with check (exists (select 1 from public.seasons s where s.id = rounds.season_id
                      and public.has_league_role(s.league_id, array['owner','manager'])));

-- brackets ---------------------------------------------------
drop policy if exists "brackets_read_members" on public.brackets;
create policy "brackets_read_members" on public.brackets for select using (
  exists (select 1 from public.rounds r join public.seasons s on s.id = r.season_id
          where r.id = brackets.round_id
            and public.has_league_role(s.league_id, array['owner','manager','player']))
);

drop policy if exists "brackets_write_staff" on public.brackets;
create policy "brackets_write_staff" on public.brackets for all
  using (exists (select 1 from public.rounds r join public.seasons s on s.id = r.season_id
                 where r.id = brackets.round_id
                   and public.has_league_role(s.league_id, array['owner','manager'])))
  with check (exists (select 1 from public.rounds r join public.seasons s on s.id = r.season_id
                      where r.id = brackets.round_id
                        and public.has_league_role(s.league_id, array['owner','manager'])));

-- match_participations ---------------------------------------
drop policy if exists "mp_read_members" on public.match_participations;
create policy "mp_read_members" on public.match_participations for select using (
  exists (select 1 from public.brackets b join public.rounds r on r.id = b.round_id
          join public.seasons s on s.id = r.season_id
          where b.id = match_participations.bracket_id
            and public.has_league_role(s.league_id, array['owner','manager','player']))
);

drop policy if exists "mp_write_self_or_staff" on public.match_participations;
create policy "mp_write_self_or_staff" on public.match_participations for all
  using (
    player_id = auth.uid()
    or exists (select 1 from public.brackets b join public.rounds r on r.id = b.round_id
               join public.seasons s on s.id = r.season_id
               where b.id = match_participations.bracket_id
                 and public.has_league_role(s.league_id, array['owner','manager']))
  )
  with check (
    player_id = auth.uid()
    or exists (select 1 from public.brackets b join public.rounds r on r.id = b.round_id
               join public.seasons s on s.id = r.season_id
               where b.id = match_participations.bracket_id
                 and public.has_league_role(s.league_id, array['owner','manager']))
  );

-- ranking_snapshots ------------------------------------------
drop policy if exists "rs_read" on public.ranking_snapshots;
create policy "rs_read" on public.ranking_snapshots for select using (
  exists (select 1 from public.seasons s join public.leagues l on l.id = s.league_id
          where s.id = ranking_snapshots.season_id
            and (l.is_public or public.has_league_role(l.id, array['owner','manager','player'])))
);

-- Writes only through service_role key or SECURITY DEFINER functions.
drop policy if exists "rs_no_client_writes" on public.ranking_snapshots;
create policy "rs_no_client_writes" on public.ranking_snapshots for all to authenticated
  using (false) with check (false);

-- ============================================================
-- done
-- ============================================================
