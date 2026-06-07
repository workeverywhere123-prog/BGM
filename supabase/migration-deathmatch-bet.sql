-- 데스매치 베팅 설정 컬럼 추가
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS deathmatch_bet int NOT NULL DEFAULT 3
    CHECK (deathmatch_bet BETWEEN 1 AND 10);

COMMENT ON COLUMN rooms.deathmatch_bet IS '데스매치 인당 베팅 라피스 수 (1~10, 기본 3)';
