-- ============================================================
-- 殷學社教育中心 AI 出卷平台 — Supabase Schema
-- 版本：1.0.0  日期：2026-05-31
-- 使用方式：在 Supabase Dashboard > SQL Editor 貼上並執行
-- ============================================================

-- 啟用 UUID 擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. 家長帳號 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone           VARCHAR(20) UNIQUE NOT NULL,
  nickname        TEXT,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 測試帳號（密碼：1234，bcrypt hash）
-- 注意：此 hash 對應密碼 "1234"，正式上線前請更改
INSERT INTO parents (phone, nickname, password_hash)
VALUES (
  '12345678',
  '測試家長',
  '$2b$10$XXgFQ1GO87UP4/WZk6wn0.F6uM8Iy4jbthImiEctYO/6.MNIwDOi2'
)
ON CONFLICT (phone) DO NOTHING;

-- ── 2. 孩子檔案 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS children (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  grade       VARCHAR(10) DEFAULT 'P3',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── 3. 練習卷 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS papers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id       UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id        UUID REFERENCES children(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL DEFAULT '常識科',
  topic           TEXT DEFAULT '生活多姿彩',
  unit            TEXT DEFAULT '單元一',
  question_types  TEXT[] NOT NULL DEFAULT ARRAY['mc'],
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 3),
  page_count      INTEGER DEFAULT 2 CHECK (page_count BETWEEN 1 AND 6),
  mode            TEXT DEFAULT 'online' CHECK (mode IN ('online', 'pdf')),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'completed')),
  generated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at    TIMESTAMPTZ
);

-- ── 4. 題目 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id        UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL CHECK (question_type IN ('mc','tf','fill','match','classify','short','essay')),
  options         JSONB,
  correct_answer  TEXT NOT NULL,
  explanation     TEXT,
  child_answer    TEXT,
  is_correct      BOOLEAN,
  answered_at     TIMESTAMPTZ,
  UNIQUE(paper_id, question_number)
);

-- ── 5. 成績記錄 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id            UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  child_id            UUID REFERENCES children(id) ON DELETE SET NULL,
  total_questions     INTEGER NOT NULL,
  correct_count       INTEGER NOT NULL,
  score_percentage    DECIMAL(5,2) NOT NULL,
  time_spent_seconds  INTEGER,
  completed_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── 6. 知識庫（小三常識科 生活多姿彩 單元一）────────────────
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject                 TEXT NOT NULL DEFAULT '常識科',
  year                    TEXT NOT NULL DEFAULT 'P3',
  topic                   TEXT NOT NULL,
  unit                    TEXT NOT NULL,
  knowledge_point         TEXT NOT NULL,
  learning_objective      TEXT NOT NULL,
  level                   INTEGER DEFAULT 1,
  applicable_question_types TEXT[] DEFAULT ARRAY['mc','tf','fill'],
  source                  TEXT DEFAULT 'mock',
  last_updated            TIMESTAMPTZ DEFAULT NOW(),
  version                 INTEGER DEFAULT 1
);

-- 插入 10 個知識點
INSERT INTO knowledge_chunks (subject, year, topic, unit, knowledge_point, learning_objective, level, applicable_question_types) VALUES
('常識科', 'P3', '生活多姿彩', '單元一', '香港的節日', '認識香港主要節日及其習俗，包括農曆新年、中秋節、聖誕節等', 1, ARRAY['mc','tf','fill','short']),
('常識科', 'P3', '生活多姿彩', '單元一', '農曆新年習俗', '了解農曆新年的傳統習俗，如派利是、舞獅、貼揮春等', 1, ARRAY['mc','tf','fill','match']),
('常識科', 'P3', '生活多姿彩', '單元一', '中秋節習俗', '認識中秋節的由來及習俗，包括賞月、提燈籠、吃月餅等', 1, ARRAY['mc','tf','fill','short']),
('常識科', 'P3', '生活多姿彩', '單元一', '端午節習俗', '了解端午節的由來及習俗，包括扒龍舟、吃粽子等', 1, ARRAY['mc','tf','fill','match']),
('常識科', 'P3', '生活多姿彩', '單元一', '香港的飲食文化', '認識香港多元飲食文化，包括茶樓、大排檔、西餐等', 2, ARRAY['mc','tf','fill','classify']),
('常識科', 'P3', '生活多姿彩', '單元一', '香港的交通工具', '認識香港各種交通工具，包括地鐵、巴士、電車、渡輪等', 1, ARRAY['mc','tf','fill','classify','match']),
('常識科', 'P3', '生活多姿彩', '單元一', '香港的地標', '認識香港著名地標，如維多利亞港、天壇大佛、青馬大橋等', 2, ARRAY['mc','tf','fill','short']),
('常識科', 'P3', '生活多姿彩', '單元一', '香港的氣候', '了解香港四季氣候特點，認識颱風及雨季對生活的影響', 2, ARRAY['mc','tf','fill','short','essay']),
('常識科', 'P3', '生活多姿彩', '單元一', '家庭成員與關係', '認識家庭成員的稱謂及家庭關係，了解家庭的重要性', 1, ARRAY['mc','tf','fill','match']),
('常識科', 'P3', '生活多姿彩', '單元一', '社區設施與服務', '認識社區中的各種設施與服務，如圖書館、醫院、消防局等', 1, ARRAY['mc','tf','fill','classify','short'])
ON CONFLICT DO NOTHING;

-- ── 索引 ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_papers_parent_id ON papers(parent_id);
CREATE INDEX IF NOT EXISTS idx_papers_generated_at ON papers(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_scores_paper_id ON scores(paper_id);
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_subject_year ON knowledge_chunks(subject, year);

-- ── Row Level Security（RLS）────────────────────────────────
-- 注意：以下 RLS 設定假設使用 service role key 繞過 RLS
-- 若使用 anon key，需要額外設定 RLS policies
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- 允許 service role 完全存取（應用程式使用 service role key）
CREATE POLICY "service_role_all" ON parents FOR ALL USING (true);
CREATE POLICY "service_role_all" ON children FOR ALL USING (true);
CREATE POLICY "service_role_all" ON papers FOR ALL USING (true);
CREATE POLICY "service_role_all" ON questions FOR ALL USING (true);
CREATE POLICY "service_role_all" ON scores FOR ALL USING (true);
CREATE POLICY "service_role_all" ON knowledge_chunks FOR ALL USING (true);

-- ============================================================
-- Schema 建立完成
-- ============================================================
