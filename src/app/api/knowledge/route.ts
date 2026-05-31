import { NextRequest, NextResponse } from 'next/server'
import { KNOWLEDGE_BASE } from '@/lib/knowledgeBase'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subject = searchParams.get('subject') || 'gs'

  // Map subject ID to subject name
  const subjectMap: Record<string, string> = {
    gs: '常識科',
    ma: '數學科',
    ch: '中文科',
    en: '英文科',
  }
  const subjectName = subjectMap[subject] || '常識科'

  // For 常識科: use static knowledge base (existing behaviour)
  if (subject === 'gs') {
    return NextResponse.json({ knowledge: KNOWLEDGE_BASE })
  }

  // For 數學科 and others: try Supabase first, fallback to empty
  try {
    const { data, error } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('id, subject, year, category, subcategory, topic, unit, knowledge_point, learning_objective, level, applicable_question_types, source')
      .eq('subject', subjectName)
      .order('id')

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
