import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { createSession, SESSION_COOKIE } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json()

    if (!phone || !password) {
      return NextResponse.json({ error: '請填寫手機號碼和密碼' }, { status: 400 })
    }

    const { data: parent } = await supabaseAdmin
      .from('parents')
      .select('*')
      .eq('phone', phone)
      .single()

    if (!parent) {
      return NextResponse.json({ error: '手機號碼或密碼錯誤' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, parent.password_hash)
    if (!valid) {
      return NextResponse.json({ error: '手機號碼或密碼錯誤' }, { status: 401 })
    }

    const token = await createSession({ parentId: parent.id, phone: parent.phone, nickname: parent.nickname })

    const res = NextResponse.json({
      success: true,
      parent: { id: parent.id, phone: parent.phone, nickname: parent.nickname },
    })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (e) {
    console.error('[login]', e)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
