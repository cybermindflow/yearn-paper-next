import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { generateQuestions } from '@/lib/mockLLM'
import { KNOWLEDGE_BASE, getKnowledgeByIds } from '@/lib/knowledgeBase'

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
  const selectedKnowledgeIds: string[] = body.knowledgeIds || KNOWLEDGE_BASE.map(k => k.id)
  const knowledgeChunks = getKnowledgeByIds(selectedKnowledgeIds)

  // Determine total questions from page count
  const questionsPerPage = 3
  const totalQuestions = paper.page_count * questionsPerPage

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
