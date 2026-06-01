import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/diagnosis/finalize-paper
// Updates paper status from 'pending' to 'generated' after all batches are done.

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { paperId } = body

  if (!paperId) {
    return NextResponse.json({ error: '缺少 paperId' }, { status: 400 })
  }

  // Verify ownership
  const { data: paper, error: paperError } = await supabaseAdmin
    .from('papers')
    .select('id, parent_id')
    .eq('id', paperId)
    .single()

  if (paperError || !paper) {
    return NextResponse.json({ error: '找不到診斷卷' }, { status: 404 })
  }
  if (paper.parent_id !== session.parentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Update status to 'generated'
  const { error: updateError } = await supabaseAdmin
    .from('papers')
    .update({ status: 'generated' })
    .eq('id', paperId)

  if (updateError) {
    console.error('[finalize-paper] Update error:', updateError.message)
    return NextResponse.json({ error: '更新診斷卷狀態失敗' }, { status: 500 })
  }

  return NextResponse.json({ success: true, paperId })
}
