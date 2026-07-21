import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { generateQuestions } from '@/lib/mockLLM'
import { KNOWLEDGE_BASE, CHINESE_P3_KNOWLEDGE, SCIENCE_P3_KNOWLEDGE, ENGLISH_P3_KNOWLEDGE, getKnowledgeByIds, KnowledgeChunk } from '@/lib/knowledgeBase'

// Helper: detect if an ID is a knowledge point base code (e.g. "M3_01") vs UUID
function isBaseCode(id: string): boolean {
  return /^[A-Z]\d+_\d+$/.test(id)
}

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
      // Check if IDs are base codes (e.g. "M3_01") or UUIDs
      // Base codes come from diagnosis mode (weakPointIds); UUIDs come from Step 2 selection
      const firstId = selectedKnowledgeIds[0]
      if (isBaseCode(firstId)) {
        // Diagnosis mode: IDs are base codes like "M3_01"
        // knowledge_chunks.unit is like "M3_01_L1", "M3_01_L2", "M3_01_L3"
        // Use unit prefix matching: expand each base code to L1+L2 variants
        const unitPatterns = selectedKnowledgeIds.flatMap(code => [
          `${code}_L1`,
          `${code}_L2`,
        ])
        console.log('[generate] Diagnosis mode: querying by unit patterns:', unitPatterns.slice(0, 6), '...')
        query = query.in('unit', unitPatterns)
      } else {
        // Normal practice mode: IDs are UUIDs from knowledge_chunks.id
        query = query.in('id', selectedKnowledgeIds)
      }
    }

    const { data: mathChunks, error: mathError } = await query.order('unit')

    if (mathError) {
      console.error('[generate] Math knowledge fetch error:', mathError.message)
      return NextResponse.json({ error: '無法讀取數學科知識點' }, { status: 500 })
    }

    if (!mathChunks || mathChunks.length === 0) {
      console.error('[generate] No math chunks found. selectedKnowledgeIds:', selectedKnowledgeIds)
      return NextResponse.json({ error: '找不到數學科知識點，請先執行 Migration' }, { status: 400 })
    }

    console.log(`[generate] Found ${mathChunks.length} math knowledge chunks`)

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
  } else if (paper.subject === '中文科') {
    // For 中文科: use static Chinese knowledge base
    if (selectedKnowledgeIds.length > 0) {
      const allChinese = CHINESE_P3_KNOWLEDGE
      knowledgeChunks = allChinese.filter(k => selectedKnowledgeIds.includes(k.id))
      if (knowledgeChunks.length === 0) knowledgeChunks = allChinese
    } else {
      knowledgeChunks = CHINESE_P3_KNOWLEDGE
    }
    console.log(`[generate] 中文科: using ${knowledgeChunks.length} knowledge chunks`)
  } else if (paper.subject === '科學科') {
    // For 科學科: use static Science knowledge base
    if (selectedKnowledgeIds.length > 0) {
      const allScience = SCIENCE_P3_KNOWLEDGE
      knowledgeChunks = allScience.filter(k => selectedKnowledgeIds.includes(k.id))
      if (knowledgeChunks.length === 0) knowledgeChunks = allScience
    } else {
      knowledgeChunks = SCIENCE_P3_KNOWLEDGE
    }
    console.log(`[generate] 科學科: using ${knowledgeChunks.length} knowledge chunks`)
  } else if (paper.subject === '英文科') {
    // For 英文科: use static English knowledge base
    if (selectedKnowledgeIds.length > 0) {
      const allEnglish = ENGLISH_P3_KNOWLEDGE
      knowledgeChunks = allEnglish.filter(k => selectedKnowledgeIds.includes(k.id))
      if (knowledgeChunks.length === 0) knowledgeChunks = allEnglish
    } else {
      knowledgeChunks = ENGLISH_P3_KNOWLEDGE
    }
    console.log(`[generate] 英文科: using ${knowledgeChunks.length} knowledge chunks`)
  } else if (paper.subject === '人文科') {
    // For 人文科: map to 常識科 knowledge base (Phase 5 design)
    const gsKnowledge = KNOWLEDGE_BASE.filter(k => k.subject === '常識科')
    if (selectedKnowledgeIds.length > 0) {
      knowledgeChunks = gsKnowledge.filter(k => selectedKnowledgeIds.includes(k.id))
      if (knowledgeChunks.length === 0) knowledgeChunks = gsKnowledge
    } else {
      knowledgeChunks = gsKnowledge
    }
    console.log(`[generate] 人文科 (映射常識科): using ${knowledgeChunks.length} knowledge chunks`)
  } else {
    // For 常識科 and others: use static knowledge base
    const gsKnowledge = KNOWLEDGE_BASE.filter(k => k.subject === '常識科')
    if (selectedKnowledgeIds.length > 0) {
      knowledgeChunks = getKnowledgeByIds(selectedKnowledgeIds)
      if (knowledgeChunks.length === 0) knowledgeChunks = gsKnowledge
    } else {
      knowledgeChunks = gsKnowledge
    }
  }

  // For targeted practice (diagnosis source), fetch recent 5 practice papers' questions to avoid repeats
  let previousQuestions: string[] | undefined
  const diagnosisSource = body.diagnosisSource as { scoreId?: string } | undefined
  if (diagnosisSource?.scoreId || paper.mode === 'practice') {
    try {
      // Get the most recent 5 completed practice papers for this parent (excluding current paper)
      const { data: recentPapers } = await supabaseAdmin
        .from('papers')
        .select('id')
        .eq('parent_id', session.parentId)
        .eq('mode', 'practice')
        .eq('status', 'completed')
        .neq('id', id)
        .order('completed_at', { ascending: false })
        .limit(5)

      if (recentPapers && recentPapers.length > 0) {
        const recentPaperIds = recentPapers.map(p => p.id)
        const { data: recentQuestions } = await supabaseAdmin
          .from('questions')
          .select('question_text')
          .in('paper_id', recentPaperIds)
          .limit(50) // cap at 50 to avoid huge prompts

        if (recentQuestions && recentQuestions.length > 0) {
          previousQuestions = recentQuestions.map(q => q.question_text)
          console.log(`[generate] Loaded ${previousQuestions.length} previous questions for deduplication`)
        }
      }
    } catch (err) {
      console.warn('[generate] Failed to fetch previous questions:', err)
    }
  }

  const generated = await generateQuestions({
    knowledgeChunks,
    questionTypes: paper.question_types,
    totalQuestions,
    difficulty: paper.difficulty_level,
    previousQuestions,
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
    image_key: q.image_key || null,
    diagram_spec: q.diagram_spec || null,
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
