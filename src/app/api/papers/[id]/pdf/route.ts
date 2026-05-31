import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

const FONT_DIR = path.join(process.cwd(), 'fonts')
const FONT_REGULAR = path.join(FONT_DIR, 'NotoSansTC-Regular.otf')
const FONT_BOLD = path.join(FONT_DIR, 'NotoSansTC-Bold.otf')

const DISCLAIMER =
  '免責聲明：本練習卷由殷學社教育中心 AI 系統自動生成，僅供學習參考之用。題目內容已力求準確，惟如有任何錯誤或遺漏，本中心恕不負責。如有疑問，請向老師查詢。'

// A4 page constants (points)
const PAGE_MARGIN = 50
const CONTENT_BOTTOM = 762  // PAGE_HEIGHT(841.89) - PAGE_MARGIN(50) - FOOTER(30)

function hasCjkFonts(): boolean {
  return fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD)
}

/**
 * Distribute questions evenly across targetPages pages.
 * Uses question count (not height) for predictable, uniform distribution.
 * Falls back to natural page-break if questions overflow a page.
 */
function distributeQuestions(totalQ: number, targetPages: number): number[][] {
  // Clamp: we need at least 1 page, and at most totalQ pages
  const pages = Math.max(1, Math.min(targetPages, totalQ))
  const qPerPage = Math.ceil(totalQ / pages)
  const buckets: number[][] = []
  for (let p = 0; p < pages; p++) {
    const start = p * qPerPage
    const end = Math.min(start + qPerPage, totalQ)
    if (start < totalQ) {
      buckets.push(Array.from({ length: end - start }, (_, i) => start + i))
    }
  }
  // Pad empty pages if needed
  while (buckets.length < pages) buckets.push([])
  return buckets
}

async function buildPdf(
  paper: Record<string, unknown>,
  questions: Record<string, unknown>[],
  type: 'question' | 'answer',
  targetPages: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const useCjk = hasCjkFonts()
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const setFont = (bold = false, size = 12) => {
      if (useCjk) {
        doc.registerFont('Regular', FONT_REGULAR)
        doc.registerFont('Bold', FONT_BOLD)
        doc.font(bold ? 'Bold' : 'Regular').fontSize(size)
      } else {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
      }
    }

    // ── Watermark helper ──────────────────────────────────────────────────────
    const drawWatermarkOnPage = () => {
      doc.save()
      doc.opacity(0.07)
      doc.rotate(-45, { origin: [297, 421] })
      setFont(true, 38)
      doc.fillColor('#2d6a4f')
      for (let y = -200; y < 1000; y += 170) {
        for (let x = -250; x < 750; x += 290) {
          doc.text('殷學社教育中心', x, y, { lineBreak: false })
        }
      }
      doc.restore()
    }

    // ── Page header helper ────────────────────────────────────────────────────
    const drawPageHeader = (isFirstPage: boolean) => {
      if (isFirstPage) {
        setFont(true, 20)
        doc.fillColor('#1b4332')
        doc.text('殷學社教育中心', { align: 'center' })
        doc.moveDown(0.3)
        setFont(false, 11)
        doc.fillColor('#2d6a4f')
        doc.text(
          `${paper.subject as string} · ${paper.topic as string} · ${paper.unit as string}`,
          { align: 'center' }
        )
        doc.moveDown(0.3)
        setFont(false, 9)
        doc.fillColor('#5a7a65')
        doc.text(new Date().toLocaleDateString('zh-HK'), { align: 'right' })
        // Divider
        doc.moveDown(0.5)
        doc.moveTo(PAGE_MARGIN, doc.y).lineTo(545, doc.y).strokeColor('#e0ebe3').lineWidth(1).stroke()
        doc.moveDown(0.5)
        // Student info row
        setFont(false, 11)
        doc.fillColor('#1a2e22')
        doc.text('姓名：＿＿＿＿＿＿＿＿＿＿＿＿＿', PAGE_MARGIN, doc.y, { continued: true, width: 220 })
        doc.text('班別：＿＿＿＿＿', { continued: true, width: 150 })
        doc.text('日期：＿＿＿＿＿')
        // AI Disclaimer on first page
        doc.moveDown(0.5)
        setFont(false, 8)
        doc.fillColor('#92400e')
        doc.rect(PAGE_MARGIN, doc.y, 495, 22).fillAndStroke('#fffbeb', '#f59e0b')
        doc.fillColor('#92400e')
        doc.text(
          '【AI 生成內容｜僅供參考】本練習卷由 AI 自動生成，題目及答案可能不完全準確。建議家長在使用前核對內容。',
          PAGE_MARGIN + 6, doc.y - 16,
          { width: 483, lineBreak: false }
        )
        doc.moveDown(1.2)
      } else {
        setFont(false, 9)
        doc.fillColor('#5a7a65')
        doc.text(
          `殷學社教育中心 · ${paper.subject as string} · ${paper.unit as string}（續）`,
          { align: 'center' }
        )
        doc.moveDown(0.5)
        doc.moveTo(PAGE_MARGIN, doc.y).lineTo(545, doc.y).strokeColor('#e0ebe3').lineWidth(1).stroke()
        doc.moveDown(0.5)
      }
    }

    // ── Distribute questions evenly ───────────────────────────────────────────
    const typedQuestions = questions as Array<{
      question_number: number
      question_type: string
      question_text: string
      options: Record<string, string> | null
      correct_answer: string
      explanation: string
    }>

    const pageBuckets = distributeQuestions(typedQuestions.length, targetPages)

    // ── Render pages ──────────────────────────────────────────────────────────
    const typeLabel: Record<string, string> = {
      mc: '選擇題', tf: '判斷題', fill: '填充題',
      match: '配對題', classify: '分類題', short: '問答題', essay: '問答題',
    }

    for (let pageIdx = 0; pageIdx < pageBuckets.length; pageIdx++) {
      if (pageIdx > 0) doc.addPage()
      drawPageHeader(pageIdx === 0)

      const bucket = pageBuckets[pageIdx]
      for (const qIdx of bucket) {
        const q = typedQuestions[qIdx]

        // Safety: if we're near the bottom of the page, add a new page
        if (doc.y > CONTENT_BOTTOM - 40) {
          doc.addPage()
          drawPageHeader(false)
        }

        // Question badge + text
        setFont(true, 10)
        doc.fillColor('#2d6a4f')
        const badge = typeLabel[q.question_type] || q.question_type
        doc.text(`[${badge}]  `, PAGE_MARGIN, doc.y, { continued: true })
        setFont(false, 11)
        doc.fillColor('#1a2e22')
        doc.text(`${q.question_number}. ${q.question_text}`)
        doc.moveDown(0.4)

        if (type === 'question') {
          // Options
          if (q.options && typeof q.options === 'object') {
            for (const [key, val] of Object.entries(q.options)) {
              if (key.length <= 1) {
                setFont(false, 10)
                doc.fillColor('#333')
                doc.text(`   ${key}. ${val}`, { indent: 20 })
              }
            }
          }
          // Answer line for fill/short/essay
          if (['fill', 'short', 'essay'].includes(q.question_type)) {
            doc.moveDown(0.3)
            setFont(false, 10)
            doc.fillColor('#aaa')
            doc.text('答：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿', { indent: 20 })
            if (['short', 'essay'].includes(q.question_type)) {
              doc.text('＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿', { indent: 20 })
            }
          }
        } else {
          // Answer key
          setFont(true, 10)
          doc.fillColor('#2d6a4f')
          doc.text(`   答案：${q.correct_answer}`, { indent: 20 })
          if (q.explanation) {
            setFont(false, 9)
            doc.fillColor('#5a7a65')
            doc.text(`   解釋：${q.explanation}`, { indent: 20 })
          }
        }
        doc.moveDown(0.8)
      }
    }

    // ── Post-render: watermark + disclaimer on every page ────────────────────
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i)
      if (type === 'question') drawWatermarkOnPage()
      doc.save()
      setFont(false, 7)
      doc.fillColor('#5a7a65')
      doc.text(DISCLAIMER, PAGE_MARGIN, 790, { width: 495, align: 'center' })
      doc.restore()
    }

    doc.end()
  })
}

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

  // Use the paper's page_count setting, default to 1
  const targetPages = (paper as Record<string, unknown>).page_count
    ? Number((paper as Record<string, unknown>).page_count)
    : 1

  const pdfBuffer = await buildPdf(
    paper as Record<string, unknown>,
    questions as Record<string, unknown>[],
    type,
    targetPages
  )

  const filename = type === 'question'
    ? `殷學社_題目卷_${(paper as Record<string, unknown>).unit}.pdf`
    : `殷學社_答案卷_${(paper as Record<string, unknown>).unit}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
