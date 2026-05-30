import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SETUP_SECRET = process.env.SETUP_SECRET || 'yearn-setup-2026'

const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone           VARCHAR(20) UNIQUE NOT NULL,
  nickname        TEXT,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Children table
CREATE TABLE IF NOT EXISTS children (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id   UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  grade       VARCHAR(10) DEFAULT 'P3',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Papers table
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

-- Questions table
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

-- Scores table
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

-- Knowledge chunks table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_papers_parent_id ON papers(parent_id);
CREATE INDEX IF NOT EXISTS idx_papers_generated_at ON papers(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_scores_paper_id ON scores(paper_id);
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_subject_year ON knowledge_chunks(subject, year);
`

const SEED_SQL = `
-- Insert test parent account (password: 1234)
INSERT INTO parents (phone, nickname, password_hash)
VALUES (
  '12345678',
  '測試家長',
  '$2b$10$XXgFQ1GO87UP4/WZk6wn0.F6uM8Iy4jbthImiEctYO/6.MNIwDOi2'
)
ON CONFLICT (phone) DO NOTHING;

-- Insert knowledge chunks
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
`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const results: string[] = []

  try {
    // Execute schema SQL via Supabase's exec function
    // We need to use the pg endpoint or create tables via individual statements
    
    // Split SQL into individual statements and execute each
    const statements = SCHEMA_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const stmt of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
        if (error && !error.message.includes('already exists')) {
          results.push(`⚠️ ${stmt.substring(0, 50)}... : ${error.message}`)
        } else {
          results.push(`✅ ${stmt.substring(0, 50)}...`)
        }
      } catch (e) {
        results.push(`❌ ${stmt.substring(0, 50)}... : ${String(e)}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Setup completed',
      results
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      results
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  // Allow POST for setup as well
  return GET(request)
}
