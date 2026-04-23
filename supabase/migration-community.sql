-- ============================================================
-- M3: 커뮤니티 기능 추가
-- notices, posts, player_games, players.is_admin
-- ============================================================

-- players에 관리자 플래그 추가
alter table public.players
  add column if not exists is_admin boolean not null default false;

-- ============================================================
-- notices (공지사항)
-- ============================================================
create table if not exists public.notices (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  content     text not null,
  category    text not null default 'general'
              check (category in ('general','rule','event','important')),
  is_pinned   boolean not null default false,
  author_id   uuid not null references public.players(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_notices_created on public.notices(created_at desc);

-- ============================================================
-- posts (커뮤니티 게시판)
-- ============================================================
create table if not exists public.posts (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  content     text not null,
  category    text not null default 'free'
              check (category in ('free','game_review','question','tip')),
  author_id   uuid not null references public.players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_posts_created on public.posts(created_at desc);

-- ============================================================
-- player_games (플레이어 보유 보드게임)
-- ============================================================
create table if not exists public.player_games (
  id            uuid primary key default uuid_generate_v4(),
  player_id     uuid not null references public.players(id) on delete cascade,
  bgg_id        integer,                    -- BoardGameGeek ID
  boardlife_id  text,                       -- 보드라이프 ID (있을 경우)
  name          text not null,              -- 게임 이름 (KR 우선)
  name_en       text,                       -- 영문 이름
  thumbnail_url text,                       -- BGG 썸네일
  min_players   integer,
  max_players   integer,
  is_available  boolean not null default true,  -- 모임 대여 가능 여부
  note          text,                           -- 메모
  created_at    timestamptz not null default now(),
  unique (player_id, bgg_id)
);
create index if not exists idx_pg_player on public.player_games(player_id);
create index if not exists idx_pg_bgg on public.player_games(bgg_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.notices      enable row level security;
alter table public.posts        enable row level security;
alter table public.player_games enable row level security;

-- notices: 누구나 읽기, 관리자만 쓰기
drop policy if exists "notices_read" on public.notices;
create policy "notices_read" on public.notices for select using (true);

drop policy if exists "notices_write_admin" on public.notices;
create policy "notices_write_admin" on public.notices for all to authenticated
  using (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));

-- posts: 누구나 읽기, 본인 쓰기/수정/삭제
drop policy if exists "posts_read" on public.posts;
create policy "posts_read" on public.posts for select using (true);

drop policy if exists "posts_write_self" on public.posts;
create policy "posts_write_self" on public.posts for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "posts_update_self" on public.posts;
create policy "posts_update_self" on public.posts for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "posts_delete_self_or_admin" on public.posts;
create policy "posts_delete_self_or_admin" on public.posts for delete
  using (
    author_id = auth.uid()
    or exists (select 1 from public.players where id = auth.uid() and is_admin = true)
  );

-- player_games: 누구나 읽기, 본인 관리
drop policy if exists "pg_read" on public.player_games;
create policy "pg_read" on public.player_games for select using (true);

drop policy if exists "pg_write_self" on public.player_games;
create policy "pg_write_self" on public.player_games for all to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());

-- ============================================================
-- updated_at 트리거
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['notices','posts'] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%s', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s for each row execute function public.set_updated_at()',
      t, t);
  end loop;
end $$;
