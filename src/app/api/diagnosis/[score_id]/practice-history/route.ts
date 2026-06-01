import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ score_id: string }> }
) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { score_id } = await params

  // Get the diagnosis score to find the subject/unit
  const { data: score } = await supabaseAdmin
    .from('scores')
    .select('paper_id, papers!inner(subject, unit, parent_id)')
    .eq('id', score_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const papers = score?.papers as unknown as { subject: string; unit: string; parent_id: string } | null
  if (!score || papers?.parent_id !== session.parentId) {
    return NextResponse.json({ count: 0, lastDate: null })
  }

  // Count targeted practice papers generated after this diagnosis
  // (papers with mode='practice' created after the diagnosis score's paper)
  const { data: diagnosisPaper } = await supabaseAdmin
    .from('papers')
    .select('created_at')
    .eq('id', score.paper_id as string)
    .single()

  if (!diagnosisPaper) {
    return NextResponse.json({ count: 0, lastDate: null })
  }

  // Count practice papers created after the diagnosis paper for this parent
  const { data: practiceScores } = await supabaseAdmin
    .from('scores')
    .select('completed_at, papers!inner(mode, parent_id, created_at)')
    .eq('papers.parent_id', session.parentId)
    .eq('papers.mode', 'practice')
    .gte('papers.created_at', diagnosisPaper.created_at)
    .order('completed_at', { ascending: false })

  const count = practiceScores?.length || 0
  const lastDate = practiceScores && practiceScores.length > 0
    ? practiceScores[0].completed_at
    : null

  return NextResponse.json({ count, lastDate })
}
