import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import { generatePdfBuffer } from '@/lib/pdfGenerator'
import type { DiagramSpec } from '@/types/diagram'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const type = (req.nextUrl.searchParams.get('type') || 'question') as 'question' | 'answer'

  const { data: paper } = await supabaseAdmin
    .from('papers')
    .select('*')
    .eq('id', id)
    .eq('parent_id', session.parentId)
    .single()

  if (!paper) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('paper_id', id)
    .order('question_number', { ascending: true })

  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: '尚未生成題目' }, { status: 400 })
  }

  const typedPaper = paper as {
    subject: string
    topic: string
    unit: string
    year?: string
  }

  const typedQuestions = (questions as Array<{
    question_number: number
    question_type: string
    question_text: string
    options: Record<string, string> | null
    correct_answer: string
    explanation: string
    image_key?: string | null
    diagram_spec?: DiagramSpec | null
  }>)

  try {
    const pdfBuffer = await generatePdfBuffer(typedPaper, typedQuestions, type)

    const subject = typedPaper.subject || '科目'
    const filename = type === 'question'
      ? `殷學社_模擬考試題目卷_${subject}.pdf`
      : `殷學社_模擬考試答案卷_${subject}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[PDF] Exam PDF generation failed:', err)
    return NextResponse.json(
      { error: 'PDF 生成失敗，請稍後再試' },
      { status: 500 }
    )
  }
}
