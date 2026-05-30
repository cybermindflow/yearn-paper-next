import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { createSession, SESSION_COOKIE } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { phone, password, nickname } = await req.json()

    if (!phone || !password) {
      return NextResponse.json({ error: '請填寫手機號碼和密碼' }, { status: 400 })
    }
    if (password.length < 4) {
      return NextResponse.json({ error: '密碼至少需要 4 位' }, { status: 400 })
    }

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from('parents')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existing) {
      return NextResponse.json({ error: '此手機號碼已被註冊' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const { data: parent, error } = await supabaseAdmin
      .from('parents')
      .insert({ phone, nickname: nickname || null, password_hash: passwordHash })
      .select()
      .single()

    if (error || !parent) {
      return NextResponse.json({ error: '註冊失敗，請稍後再試' }, { status: 500 })
    }

    const token = await createSession({ parentId: parent.id, phone: parent.phone, nickname: parent.nickname })

    const res = NextResponse.json({ success: true, parent: { id: parent.id, phone: parent.phone, nickname: parent.nickname } })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (e) {
    console.error('[register]', e)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
