import { NextResponse } from 'next/server'
import { KNOWLEDGE_BASE } from '@/lib/knowledgeBase'

export async function GET() {
  return NextResponse.json({ knowledge: KNOWLEDGE_BASE })
}
