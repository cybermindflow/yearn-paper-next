/**
 * pdfGenerator.ts
 * Uses puppeteer-core + @sparticuz/chromium to render HTML as PDF.
 * Works in both local development and Vercel Serverless environments.
 */

import { buildPdfHtml } from './pdfTemplate'
import type { DiagramSpec } from '@/types/diagram'

interface PaperInfo {
  subject: string
  topic: string
  unit: string
  year?: string
}

interface QuestionRow {
  question_number: number
  question_type: string
  question_text: string
  options: Record<string, string> | null
  correct_answer: string
  explanation: string
  image_key?: string | null
  diagram_spec?: DiagramSpec | null
}

async function getBrowser() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

  if (isProduction) {
    // Vercel Serverless: use @sparticuz/chromium (lightweight Chromium for Lambda/Serverless)
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default

    const executablePath = await chromium.executablePath()
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath,
      headless: true,
    })
  } else {
    // Local development: try to use system Chrome/Chromium
    const puppeteer = (await import('puppeteer-core')).default

    // Common Chrome paths
    const chromePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ]

    const fs = await import('fs')
    let executablePath = ''
    for (const p of chromePaths) {
      if (fs.existsSync(p)) {
        executablePath = p
        break
      }
    }

    if (!executablePath) {
      // Fallback: try @sparticuz/chromium in dev too
      const chromium = (await import('@sparticuz/chromium')).default
      executablePath = await chromium.executablePath()
      return puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1280, height: 720 },
        executablePath,
        headless: true,
      })
    }

    return puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  }
}

export async function generatePdfBuffer(
  paper: PaperInfo,
  questions: QuestionRow[],
  type: 'question' | 'answer'
): Promise<Buffer> {
  const html = buildPdfHtml(paper, questions, type)
  const hasDiagrams = questions.some(q => q.question_type === 'diagram_mc' && q.diagram_spec)

  const browser = await getBrowser()
  try {
    const page = await browser.newPage()

    // Set content and wait for fonts + JSXGraph to load
    await page.setContent(html, { waitUntil: ['load', 'domcontentloaded'], timeout: 30000 })

    // If there are diagrams, wait for JSXGraph to finish rendering
    if (hasDiagrams) {
      await page.waitForFunction('window.__diagramsReady === true', { timeout: 15000 })
        .catch(() => {
          // If diagrams don't finish in time, proceed anyway
          console.warn('[PDF] JSXGraph diagrams may not have fully rendered')
        })
    }

    // Small delay to ensure all rendering is complete
    await new Promise(r => setTimeout(r, 500))

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' },
      displayHeaderFooter: false,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
