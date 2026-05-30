import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('parent_id', session.parentId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ children: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, grade } = await req.json()
  if (!name) return NextResponse.json({ error: '請填寫孩子姓名' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('children')
    .insert({ parent_id: session.parentId, name, grade: grade || 'P3' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: '新增失敗' }, { status: 500 })
  return NextResponse.json({ child: data })
}
