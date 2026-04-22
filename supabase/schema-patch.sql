-- ============================================================
-- boardgame-league — schema PATCH
-- 기존 테이블이 이미 있을 때 안전하게 적용하는 마이그레이션
-- Run once in Supabase SQL Editor.
-- ============================================================

-- Step 1: players 테이블에 username 컬럼 추가 (없으면)
alter table public.players add column if not exists username text unique;
update public.players set username = split_part(email, '@', 1) where username is null;
alter table public.players alter column username set not null;

-- Step 2: 중복 제약 오류 해결 (drop → re-add)
alter table public.leagues drop constraint if exists leagues_default_game_fk;
alter table public.leagues
  add constraint leagues_default_game_fk
  foreign key (default_game_id) references public.games(id)
  on delete set null
  deferrable initially deferred;

-- Step 3: updated_at 트리거 재생성
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

-- Step 4: handle_new_user 트리거 — 아이디(username) 기반으로 업데이트
create or replace function public.handle_new_user()
returns trigger as $$
declare
  _username text;
  _nickname text;
begin
  _username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
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

-- Step 5: RLS 활성화
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

-- Step 6: has_league_role 헬퍼
create or replace function public.has_league_role(_league uuid, _roles text[])
returns boolean language sql stable as $$
  select exists (
    select 1 from public.league_memberships
    where league_id = _league
      and player_id = auth.uid()
      and role = any(_roles)
  );
$$;

-- Step 7: RLS 정책 재생성
drop policy if exists "players_read_public" on public.players;
create policy "players_read_public" on public.players for select using (true);
drop policy if exists "players_update_self" on public.players;
create policy "players_update_self" on public.players for update
  using (id = auth.uid()) with check (id = auth.uid());

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

drop policy if exists "lm_read_members" on public.league_memberships;
create policy "lm_read_members" on public.league_memberships for select using (
  public.has_league_role(league_id, array['owner','manager','player'])
);
drop policy if exists "lm_write_staff" on public.league_memberships;
create policy "lm_write_staff" on public.league_memberships for all
  using (public.has_league_role(league_id, array['owner','manager']))
  with check (public.has_league_role(league_id, array['owner','manager']));

drop policy if exists "seasons_read" on public.seasons;
create policy "seasons_read" on public.seasons for select using (
  exists (select 1 from public.leagues l where l.id = seasons.league_id
          and (l.is_public or public.has_league_role(l.id, array['owner','manager','player'])))
);
drop policy if exists "seasons_write_staff" on public.seasons;
create policy "seasons_write_staff" on public.seasons for all
  using (public.has_league_role(league_id, array['owner','manager']))
  with check (public.has_league_role(league_id, array['owner','manager']));

drop policy if exists "games_read" on public.games;
create policy "games_read" on public.games for select using (true);
drop policy if exists "games_write_authenticated" on public.games;
create policy "games_write_authenticated" on public.games for all to authenticated
  using (true) with check (true);

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

drop policy if exists "rs_read" on public.ranking_snapshots;
create policy "rs_read" on public.ranking_snapshots for select using (
  exists (select 1 from public.seasons s join public.leagues l on l.id = s.league_id
          where s.id = ranking_snapshots.season_id
            and (l.is_public or public.has_league_role(l.id, array['owner','manager','player'])))
);
drop policy if exists "rs_no_client_writes" on public.ranking_snapshots;
create policy "rs_no_client_writes" on public.ranking_snapshots for all to authenticated
  using (false) with check (false);

-- ============================================================
-- done
-- ============================================================
