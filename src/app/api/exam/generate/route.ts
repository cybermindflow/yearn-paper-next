import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { generateQuestions } from '@/lib/mockLLM'
import { KNOWLEDGE_BASE, getKnowledgeByIds, KnowledgeChunk } from '@/lib/knowledgeBase'
import { checkUsageLimit } from '@/lib/usageLimits'

/**
 * POST /api/exam/generate
 * Generate a mock exam paper with time limit and fixed question type distribution.
 *
 * Body:
 * {
 *   subject: '常識科' | '數學科'
 *   grade: 'P3'
 *   knowledgePointIds: string[] | 'all'   // 'all' = full range
 *   questionCount: 20 | 30 | 40
 *   timeLimitMinutes: 30 | 45 | 60
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Usage limit check
  const usage = await checkUsageLimit(session.parentId)
  if (!usage.allowed) {
    return NextResponse.json({
      error: `已達免費版使用上限（${usage.limit} 次），請聯絡殷學社教育中心升級方案。`
    }, { status: 403 })
  }

  const body = await req.json()
  const {
    subject = '常識科',
    grade = 'P3',
    knowledgePointIds = 'all',
    questionCount = 30,
    timeLimitMinutes = 45,
  } = body

  // Validate inputs
  if (!['常識科', '數學科'].includes(subject)) {
    return NextResponse.json({ error: '不支援的科目' }, { status: 400 })
  }
  if (![20, 30, 40].includes(questionCount)) {
    return NextResponse.json({ error: '題目數量必須為 20、30 或 40' }, { status: 400 })
  }
  if (![30, 45, 60].includes(timeLimitMinutes)) {
    return NextResponse.json({ error: '考試時間必須為 30、45 或 60 分鐘' }, { status: 400 })
  }

  // Exam question type distribution: 60% mc, 20% tf, 10% fill, 10% short
  const mcCount = Math.round(questionCount * 0.6)
  const tfCount = Math.round(questionCount * 0.2)
  const fillCount = Math.round(questionCount * 0.1)
  const shortCount = questionCount - mcCount - tfCount - fillCount
  const questionTypes = [
    ...Array(mcCount).fill('mc'),
    ...Array(tfCount).fill('tf'),
    ...Array(fillCount).fill('fill'),
    ...Array(shortCount).fill('short'),
  ]

  // Create exam paper record
  const { data: paper, error: paperError } = await supabaseAdmin
    .from('papers')
    .insert({
      parent_id: session.parentId,
      child_id: null,
      subject,
      topic: grade,
      unit: `模擬考試 ${timeLimitMinutes}分鐘`,
      question_types: ['mc', 'tf', 'fill', 'short'],
      difficulty_level: 2,
      page_count: Math.ceil(questionCount / 3),
      mode: 'exam',
      delivery_mode: 'online',
      status: 'pending',
      time_limit_minutes: timeLimitMinutes,
    })
    .select()
    .single()

  if (paperError || !paper) {
    console.error('[exam/generate] Paper creation error:', paperError?.message)
    return NextResponse.json({ error: '建立考試卷失敗' }, { status: 500 })
  }

  // Resolve knowledge chunks
  let knowledgeChunks: KnowledgeChunk[]

  if (subject === '數學科') {
    let query = supabaseAdmin
      .from('knowledge_chunks')
      .select('id, subject, year, topic, unit, knowledge_point, learning_objective, level, applicable_question_types, source')
      .eq('subject', '數學科')
      .eq('year', grade)

    if (knowledgePointIds !== 'all' && Array.isArray(knowledgePointIds) && knowledgePointIds.length > 0) {
      query = query.in('id', knowledgePointIds)
    }

    const { data: mathChunks, error: mathError } = await query.order('unit')
    if (mathError || !mathChunks || mathChunks.length === 0) {
      // Cleanup paper
      await supabaseAdmin.from('papers').delete().eq('id', paper.id)
      return NextResponse.json({ error: '找不到數學科知識點' }, { status: 400 })
    }

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
    // 常識科: use static knowledge base
    if (knowledgePointIds !== 'all' && Array.isArray(knowledgePointIds) && knowledgePointIds.length > 0) {
      knowledgeChunks = getKnowledgeByIds(knowledgePointIds)
    } else {
      knowledgeChunks = KNOWLEDGE_BASE.filter(k => k.subject === subject && k.year === grade)
      if (knowledgeChunks.length === 0) knowledgeChunks = KNOWLEDGE_BASE
    }
  }

  // Generate questions with exam distribution
  const generated = await generateQuestions({
    knowledgeChunks,
    questionTypes,
    totalQuestions: questionCount,
    difficulty: 2,
  })

  // Insert questions
  const inserts = generated.map(q => ({
    paper_id: paper.id,
    question_number: q.question_number,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
  }))

  const { error: insertError } = await supabaseAdmin.from('questions').insert(inserts)
  if (insertError) {
    await supabaseAdmin.from('papers').delete().eq('id', paper.id)
    return NextResponse.json({ error: '題目生成失敗' }, { status: 500 })
  }

  // Update paper status to generated
  await supabaseAdmin
    .from('papers')
    .update({ status: 'generated' })
    .eq('id', paper.id)

  return NextResponse.json({
    success: true,
    paperId: paper.id,
    questionCount: generated.length,
    timeLimitMinutes,
    subject,
    grade,
  })
}
