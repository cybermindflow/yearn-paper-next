import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ parent: null }, { status: 401 })
  }
  return NextResponse.json({ parent: { id: session.parentId, phone: session.phone, nickname: session.nickname } })
}
