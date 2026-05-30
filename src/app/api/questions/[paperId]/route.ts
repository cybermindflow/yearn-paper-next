import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ paperId: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paperId } = await params

  // Verify ownership
  const { data: paper } = await supabaseAdmin
    .from('papers')
    .select('id')
    .eq('id', paperId)
    .eq('parent_id', session.parentId)
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('paper_id', paperId)
    .order('question_number', { ascending: true })

  return NextResponse.json({ questions: questions || [] })
}
