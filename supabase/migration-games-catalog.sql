-- games_catalog: 보드라이프 게임 카탈로그
-- player_games와 별개로 검색용 전체 게임 목록 저장
-- 서버사이드 boardlife API 차단 우회용 로컬 검색 인덱스

CREATE TABLE IF NOT EXISTS games_catalog (
  boardlife_id   TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  thumbnail_url  TEXT,
  boardlife_url  TEXT GENERATED ALWAYS AS ('https://boardlife.co.kr/game/' || boardlife_id) STORED,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 이름 검색을 위한 GIN 인덱스 (trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS games_catalog_name_trgm ON games_catalog USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS games_catalog_name_lower ON games_catalog (lower(name));

-- RLS: 인증된 사용자는 읽기 가능, 서비스 키로만 쓰기
ALTER TABLE games_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read catalog" ON games_catalog FOR SELECT USING (true);
CREATE POLICY "service can write catalog" ON games_catalog FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE games_catalog IS '보드라이프 게임 검색 카탈로그 (서버사이드 Cloudflare 우회용 로컬 인덱스)';
