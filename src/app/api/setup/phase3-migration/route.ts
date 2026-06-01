import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/setup/phase3-migration
// Adds source column to papers/scores and knowledge_point_id to questions
// Safe to call multiple times (IF NOT EXISTS)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  // We use individual upsert-style inserts to test if columns exist,
  // then fall back to a dummy update approach since exec_sql RPC is unavailable.
  // Strategy: try to select the column; if it errors, we know it's missing.

  // Test papers.source
  const { error: papersTest } = await supabaseAdmin
    .from('papers')
    .select('source')
    .limit(1)

  if (papersTest?.message?.includes('column') || papersTest?.message?.includes('source')) {
    results['papers.source'] = 'MISSING - needs manual ALTER TABLE'
  } else {
    results['papers.source'] = 'EXISTS or no data'
  }

  // Test scores.source
  const { error: scoresTest } = await supabaseAdmin
    .from('scores')
    .select('source')
    .limit(1)

  if (scoresTest?.message?.includes('column') || scoresTest?.message?.includes('source')) {
    results['scores.source'] = 'MISSING - needs manual ALTER TABLE'
  } else {
    results['scores.source'] = 'EXISTS or no data'
  }

  // Test questions.knowledge_point_id
  const { error: questionsTest } = await supabaseAdmin
    .from('questions')
    .select('knowledge_point_id')
    .limit(1)

  if (questionsTest?.message?.includes('column') || questionsTest?.message?.includes('knowledge_point_id')) {
    results['questions.knowledge_point_id'] = 'MISSING - needs manual ALTER TABLE'
  } else {
    results['questions.knowledge_point_id'] = 'EXISTS or no data'
  }

  return NextResponse.json({
    message: 'Phase 3 column check complete',
    results,
    sql_to_run: [
      "ALTER TABLE papers ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';",
      "ALTER TABLE scores ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'practice';",
      "ALTER TABLE questions ADD COLUMN IF NOT EXISTS knowledge_point_id TEXT DEFAULT NULL;",
    ],
  })
}
