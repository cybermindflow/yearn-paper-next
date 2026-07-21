import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/student/tasks?childId=xxx
 * Returns pending (status='pending' or 'generated') papers assigned to a specific child.
 * Requires authentication (parent session).
 */
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('childId')

  if (!childId) {
    return NextResponse.json({ error: '請提供 childId' }, { status: 400 })
  }

  // Verify the child belongs to the logged-in parent
  const { data: child } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('parent_id', session.parentId)
    .single()

  if (!child) {
    return NextResponse.json({ error: '找不到該孩子' }, { status: 404 })
  }

  // Fetch pending/generated papers for this child (online delivery mode only)
  const { data: tasks, error } = await supabaseAdmin
    .from('papers')
    .select('id, subject, topic, unit, mode, difficulty_level, page_count, status, generated_at, delivery_mode')
    .eq('child_id', childId)
    .eq('parent_id', session.parentId)
    .in('status', ['pending', 'generated'])
    .eq('delivery_mode', 'online')
    .order('generated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '讀取任務失敗' }, { status: 500 })
  }

  return NextResponse.json({
    child,
    tasks: tasks || [],
  })
}
