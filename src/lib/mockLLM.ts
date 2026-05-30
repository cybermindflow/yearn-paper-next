import { KnowledgeChunk } from './knowledgeBase'

export interface GeneratedQuestion {
  question_number: number
  question_text: string
  question_type: string
  options: Record<string, string> | null
  correct_answer: string
  explanation: string
}

export interface GenerateParams {
  knowledgeChunks: KnowledgeChunk[]
  questionTypes: string[]
  totalQuestions: number
  difficulty: number
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mc: '選擇題',
  tf: '判斷題',
  fill: '填充題',
  match: '配對題',
  classify: '分類題',
  short: '問答題',
  essay: '問答題',
}

// ── Mock question generators ──────────────────────────────────────────────────

function generateMCQuestion(chunk: KnowledgeChunk, num: number): GeneratedQuestion {
  return {
    question_number: num,
    question_text: `關於「${chunk.knowledge_point}」，以下哪一項描述是正確的？`,
    question_type: 'mc',
    options: {
      A: `${chunk.knowledge_point}是香港生活的重要部分`,
      B: `${chunk.knowledge_point}與日常生活無關`,
      C: `${chunk.knowledge_point}只適用於成年人`,
      D: `${chunk.knowledge_point}在香港並不常見`,
    },
    correct_answer: 'A',
    explanation: `${chunk.learning_objective}`,
  }
}

function generateTFQuestion(chunk: KnowledgeChunk, num: number): GeneratedQuestion {
  return {
    question_number: num,
    question_text: `「${chunk.knowledge_point}」是小三常識科的重要學習內容。（對 / 錯）`,
    question_type: 'tf',
    options: { A: '對', B: '錯' },
    correct_answer: 'A',
    explanation: `${chunk.learning_objective}`,
  }
}

function generateFillQuestion(chunk: KnowledgeChunk, num: number): GeneratedQuestion {
  const words = chunk.knowledge_point.split('')
  const blankPos = Math.floor(words.length / 2)
  const answer = words.slice(blankPos, blankPos + 2).join('')
  const questionText = chunk.knowledge_point.replace(answer, '＿＿')
  return {
    question_number: num,
    question_text: `請填寫正確答案：${questionText}`,
    question_type: 'fill',
    options: null,
    correct_answer: answer,
    explanation: `${chunk.learning_objective}`,
  }
}

function generateMatchQuestion(chunk: KnowledgeChunk, num: number): GeneratedQuestion {
  return {
    question_number: num,
    question_text: `請將「${chunk.knowledge_point}」與其正確描述配對：`,
    question_type: 'match',
    options: {
      A: chunk.knowledge_point,
      '1': chunk.learning_objective.substring(0, 30) + '...',
    },
    correct_answer: 'A-1',
    explanation: `${chunk.learning_objective}`,
  }
}

function generateShortQuestion(chunk: KnowledgeChunk, num: number): GeneratedQuestion {
  return {
    question_number: num,
    question_text: `請簡述「${chunk.knowledge_point}」的重要性。（2-3句）`,
    question_type: 'short',
    options: null,
    correct_answer: `參考答案：${chunk.learning_objective}`,
    explanation: `此題為主觀題，請老師或家長根據參考答案評分。`,
  }
}

function generateClassifyQuestion(chunk: KnowledgeChunk, num: number): GeneratedQuestion {
  return {
    question_number: num,
    question_text: `請將以下項目分類，哪些與「${chunk.knowledge_point}」有關？`,
    question_type: 'classify',
    options: {
      A: `與${chunk.topic}相關的項目`,
      B: '與其他科目相關的項目',
    },
    correct_answer: 'A',
    explanation: `${chunk.learning_objective}`,
  }
}

// ── Main generator ────────────────────────────────────────────────────────────

function generateOneQuestion(
  chunk: KnowledgeChunk,
  qType: string,
  num: number
): GeneratedQuestion {
  switch (qType) {
    case 'mc': return generateMCQuestion(chunk, num)
    case 'tf': return generateTFQuestion(chunk, num)
    case 'fill': return generateFillQuestion(chunk, num)
    case 'match': return generateMatchQuestion(chunk, num)
    case 'short':
    case 'essay': return generateShortQuestion(chunk, num)
    case 'classify': return generateClassifyQuestion(chunk, num)
    default: return generateMCQuestion(chunk, num)
  }
}

export async function generateQuestions(params: GenerateParams): Promise<GeneratedQuestion[]> {
  const useMock = process.env.USE_MOCK_LLM !== 'false'

  if (!useMock) {
    // ── Real Claude API (stub – swap in real implementation when key is available) ──
    // import Anthropic from '@anthropic-ai/sdk'
    // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    // const response = await client.messages.create({ ... })
    // return parseClaudeResponse(response)
    console.warn('[LLM] USE_MOCK_LLM=false but real API not implemented; falling back to mock')
  }

  // ── Mock generation ───────────────────────────────────────────────────────
  const { knowledgeChunks, questionTypes, totalQuestions } = params
  const questions: GeneratedQuestion[] = []
  let qNum = 1

  // Distribute questions evenly across types
  const perType = Math.ceil(totalQuestions / questionTypes.length)
  const chunkCount = knowledgeChunks.length

  for (const qType of questionTypes) {
    const typeCount = Math.min(perType, totalQuestions - questions.length)
    for (let i = 0; i < typeCount; i++) {
      const chunk = knowledgeChunks[i % chunkCount]
      questions.push(generateOneQuestion(chunk, qType, qNum++))
      if (questions.length >= totalQuestions) break
    }
    if (questions.length >= totalQuestions) break
  }

  // Small artificial delay to simulate API call
  await new Promise(r => setTimeout(r, 300))

  return questions
}

export { QUESTION_TYPE_LABELS }
