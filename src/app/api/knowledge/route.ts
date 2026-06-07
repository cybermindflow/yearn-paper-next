import { NextRequest, NextResponse } from 'next/server'
import { KNOWLEDGE_BASE, CHINESE_P3_KNOWLEDGE, SCIENCE_P3_KNOWLEDGE } from '@/lib/knowledgeBase'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject') || 'gs'

  // Map subject ID to subject name and knowledge subject (for DB query)
  const subjectMap: Record<string, { name: string; knowledgeName: string }> = {
    gs:  { name: '常識科', knowledgeName: '常識科' },
    ma:  { name: '數學科', knowledgeName: '數學科' },
    ch:  { name: '中文科', knowledgeName: '中文科' },
    en:  { name: '英文科', knowledgeName: '英文科' },
    hum: { name: '人文科', knowledgeName: '常識科' },  // 人文科映射至常識科知識庫
    sci: { name: '科學科', knowledgeName: '科學科' },
  }

  const mapped = subjectMap[subject] || { name: subject, knowledgeName: subject }
  const knowledgeName = mapped.knowledgeName

  // 常識科 / 人文科：使用靜態知識庫（46 個知識點，六大範疇）
  if (knowledgeName === '常識科') {
    const gsKnowledge = KNOWLEDGE_BASE.filter(k => k.subject === '常識科')
    return NextResponse.json({ knowledge: gsKnowledge })
  }

  // 中文科：使用靜態知識庫（27 個知識點，四大範疇）
  if (knowledgeName === '中文科') {
    return NextResponse.json({ knowledge: CHINESE_P3_KNOWLEDGE })
  }

  // 科學科：使用靜態知識庫（21 個知識點，四大範疇）
  if (knowledgeName === '科學科') {
    return NextResponse.json({ knowledge: SCIENCE_P3_KNOWLEDGE })
  }

  // 數學科及其他：查詢 Supabase
  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('id, subject, year, topic, unit, knowledge_point, learning_objective, level, applicable_question_types, source')
      .eq('subject', knowledgeName)
      .order('unit')

    if (error) {
      console.error('[knowledge API] Supabase error:', error.message)
      return NextResponse.json({ knowledge: [], error: error.message })
    }

    return NextResponse.json({ knowledge: data || [] })
  } catch (e) {
    console.error('[knowledge API] Exception:', e)
    return NextResponse.json({ knowledge: [], error: String(e) })
  }
}
