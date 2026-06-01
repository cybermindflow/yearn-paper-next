import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { generateQuestions } from '@/lib/mockLLM'
import { KNOWLEDGE_BASE, getKnowledgeByIds, KnowledgeChunk } from '@/lib/knowledgeBase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: paper } = await supabaseAdmin
    .from('papers')
    .select('*')
    .eq('id', id)
    .eq('parent_id', session.parentId)
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const selectedKnowledgeIds: string[] = body.knowledgeIds || []

  // Determine total questions from page count
  const questionsPerPage = 3
  const totalQuestions = paper.page_count * questionsPerPage

  let knowledgeChunks: KnowledgeChunk[]

  // For 數學科: fetch from Supabase knowledge_chunks table
  if (paper.subject === '數學科') {
    let query = supabaseAdmin
      .from('knowledge_chunks')
      .select('id, subject, year, topic, unit, knowledge_point, learning_objective, level, applicable_question_types, source')
      .eq('subject', '數學科')

    if (selectedKnowledgeIds.length > 0) {
      query = query.in('id', selectedKnowledgeIds)
    }

    const { data: mathChunks, error: mathError } = await query.order('id')

    if (mathError) {
      console.error('[generate] Math knowledge fetch error:', mathError.message)
      return NextResponse.json({ error: '無法讀取數學科知識點' }, { status: 500 })
    }

    if (!mathChunks || mathChunks.length === 0) {
      return NextResponse.json({ error: '找不到數學科知識點，請先執行 Migration' }, { status: 400 })
    }

    // Map Supabase rows to KnowledgeChunk interface
    knowledgeChunks = mathChunks.map(row => ({
      id: row.id,
      subject: row.subject,
      year: row.year,
      topic: row.topic || '數',
      unit: row.unit || '數（Number）',
      knowledge_point: row.knowledge_point,
      learning_objective: row.learning_objective,
      level: row.level,
      applicable_question_types: row.applicable_question_types || ['mc', 'fill'],
      source: row.source || '香港教育局《小學數學科課程指引》',
    }))
  } else {
    // For 常識科 and others: use static knowledge base
    if (selectedKnowledgeIds.length > 0) {
      knowledgeChunks = getKnowledgeByIds(selectedKnowledgeIds)
    } else {
      knowledgeChunks = KNOWLEDGE_BASE
    }
  }

  const generated = await generateQuestions({
    knowledgeChunks,
    questionTypes: paper.question_types,
    totalQuestions,
    difficulty: paper.difficulty_level,
  })

  // Insert questions
  const inserts = generated.map(q => ({
    paper_id: id,
    question_number: q.question_number,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
  }))

  // Delete old questions if regenerating
  await supabaseAdmin.from('questions').delete().eq('paper_id', id)

  const { error } = await supabaseAdmin.from('questions').insert(inserts)
  if (error) return NextResponse.json({ error: '題目生成失敗' }, { status: 500 })

  // Update paper status
  await supabaseAdmin
    .from('papers')
    .update({ status: 'generated' })
    .eq('id', id)

  return NextResponse.json({ success: true, count: generated.length })
}
