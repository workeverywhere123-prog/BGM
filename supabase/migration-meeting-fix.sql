-- ============================================================
-- Meeting Fix: league_id를 nullable로 변경
-- BGM에서는 모임이 리그와 독립적으로 운영됨
-- ============================================================

-- league_id nullable로 변경
alter table public.meetings
  alter column league_id drop not null;

-- unique constraint 완화 (league_id 없이도 회차 중복 방지)
alter table public.meetings
  drop constraint if exists meetings_league_id_number_key;

create unique index if not exists meetings_number_unique
  on public.meetings(number)
  where league_id is null;

-- RLS 재설정 (league 없이도 접근 가능)
drop policy if exists "meetings_read"       on public.meetings;
drop policy if exists "meetings_write_staff" on public.meetings;

create policy "meetings_read" on public.meetings for select using (true);

create policy "meetings_write_admin" on public.meetings for all to authenticated
  using   (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));

-- match_participants, meeting_attendances, chip_transactions RLS 보완
drop policy if exists "mp_read"        on public.match_participants;
drop policy if exists "mp_write_staff" on public.match_participants;
drop policy if exists "att_read"        on public.meeting_attendances;
drop policy if exists "att_write_staff" on public.meeting_attendances;
drop policy if exists "chip_tx_read"    on public.chip_transactions;
drop policy if exists "chip_tx_write"   on public.chip_transactions;

create policy "mp_read"       on public.match_participants for select using (true);
create policy "mp_write_admin" on public.match_participants for all to authenticated
  using   (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));

create policy "att_read"       on public.meeting_attendances for select using (true);
create policy "att_write_admin" on public.meeting_attendances for all to authenticated
  using   (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));

create policy "chip_tx_read"   on public.chip_transactions for select using (true);
create policy "chip_tx_write_admin" on public.chip_transactions for all to authenticated
  using   (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));

-- matches RLS
drop policy if exists "matches_read"       on public.matches;
drop policy if exists "matches_write_staff" on public.matches;

create policy "matches_read"       on public.matches for select using (true);
create policy "matches_write_admin" on public.matches for all to authenticated
  using   (exists (select 1 from public.players where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.players where id = auth.uid() and is_admin = true));
