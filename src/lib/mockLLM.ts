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

// ── DeepSeek API types ────────────────────────────────────────────────────────

interface DeepSeekQuestion {
  type: 'mc' | 'tf' | 'short'
  question_text: string
  options?: string[]
  correct_answer: string
  explanation: string
}

interface DeepSeekResponse {
  questions: DeepSeekQuestion[]
}

// ── DeepSeek API caller ───────────────────────────────────────────────────────

function buildSystemPrompt(
  grade: string,
  subject: string,
  questionTypes: string[],
  difficulty: number,
  totalQuestions: number,
  knowledgeContent: string
): string {
  const typeLabels = questionTypes.map(t => QUESTION_TYPE_LABELS[t] || t).join('、')
  return `你是一位香港小學教育專家。請根據以下提供的知識點內容，為香港小學${grade}${subject}學生生成練習題。

【嚴格要求】
1. 只使用下方「知識庫內容」中提供的知識點來生成題目。不得自行發明、添加或引用知識庫以外的事實。
2. 題目必須嚴格對齊香港教育局《小學常識科課程指引（2017）》的學習目標。
3. 題型：${typeLabels}
4. 難度：Level ${difficulty}
5. 生成 ${totalQuestions} 道題目
6. 使用繁體中文
7. 題目內容必須貼近香港學生的日常生活情境

【輸出格式】
請嚴格按照以下 JSON 格式輸出（只輸出 JSON，不要任何其他文字）：
{
  "questions": [
    {
      "type": "mc",
      "question_text": "題目文字",
      "options": ["A. 選項一", "B. 選項二", "C. 選項三", "D. 選項四"],
      "correct_answer": "A",
      "explanation": "解釋為什麼這是正確答案，以及為什麼其他選項不正確"
    },
    {
      "type": "tf",
      "question_text": "題目文字",
      "correct_answer": "對",
      "explanation": "解釋"
    },
    {
      "type": "short",
      "question_text": "題目文字",
      "correct_answer": "參考答案",
      "explanation": "解釋"
    }
  ]
}

【題型說明】
- mc：選擇題（4 個選項）
- tf：判斷題（正確答案為「對」或「錯」）
- short：問答題（短答，答案為一句話）

【知識庫內容】
${knowledgeContent}

【答案一致性要求】
- 同一份練習卷中，若多道題目涉及同一知識點（如「香港主要公共交通工具」），所有題目的答案必須一致，不得互相矛盾。
- 例如：若一道題問「香港最主要的集體運輸系統是什麼？」答案為「港鐵」，則同一份練習卷中不應出現另一道題暗示「渡輪」是最主要的交通工具。
- 在生成所有題目後，請自行檢查是否有答案矛盾的情況，如有則修正。

【注意】
- 只輸出 JSON，不要任何前綴或後綴
- 選擇題的選項必須以 "A. "、"B. "、"C. "、"D. " 開頭
- 每道題必須有 explanation`
}

function buildUserPrompt(questionTypes: string[], totalQuestions: number): string {
  const typeLabels = questionTypes.map(t => QUESTION_TYPE_LABELS[t] || t).join('、')
  return `請生成 ${totalQuestions} 道題目，題型包括：${typeLabels}。請嚴格按照 JSON 格式輸出。`
}

function validateDeepSeekResponse(
  data: unknown,
  expectedCount: number,
  questionTypes: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    errors.push('回傳資料不是物件')
    return { valid: false, errors }
  }

  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.questions)) {
    errors.push('缺少 questions 陣列')
    return { valid: false, errors }
  }

  const questions = obj.questions as DeepSeekQuestion[]

  if (questions.length < Math.floor(expectedCount * 0.8)) {
    errors.push(`題目數量不足：期望 ${expectedCount}，實際 ${questions.length}`)
  }

  const validTypes = new Set(['mc', 'tf', 'short', 'fill', 'essay'])
  const allowedTypes = new Set(questionTypes.flatMap(t => (t === 'essay' ? ['short', 'essay'] : [t])))

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (!q.type || !validTypes.has(q.type)) {
      errors.push(`第 ${i + 1} 題 type 無效：${q.type}`)
    }
    if (!q.question_text || typeof q.question_text !== 'string' || q.question_text.trim() === '') {
      errors.push(`第 ${i + 1} 題缺少 question_text`)
    }
    if (!q.correct_answer || typeof q.correct_answer !== 'string') {
      errors.push(`第 ${i + 1} 題缺少 correct_answer`)
    }
    if (!q.explanation || typeof q.explanation !== 'string') {
      errors.push(`第 ${i + 1} 題缺少 explanation`)
    }
    if (q.type === 'mc') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`第 ${i + 1} 題（選擇題）選項數量不正確：${q.options?.length ?? 0}`)
      }
    }
    if (q.type && !allowedTypes.has(q.type) && validTypes.has(q.type)) {
      // Allow slight type mismatch (e.g., short vs essay) — just warn
      console.warn(`[DeepSeek] 第 ${i + 1} 題類型 ${q.type} 不在請求的題型列表中`)
    }
  }

  // Contradiction check: same knowledge-point keywords but conflicting answers
  const transportKeywords = ['港鐵', '地鐵', '渡輪', '巴士', '小巴', '電車']
  const transportQs = questions.filter(q =>
    transportKeywords.some(k => q.question_text.includes(k) || q.correct_answer.includes(k))
  )
  if (transportQs.length >= 2) {
    const hasHkrailAnswer = transportQs.some(q => ['港鐵', '地鐵'].some(k => q.correct_answer.includes(k)))
    const hasFerryAnswer = transportQs.some(q => q.correct_answer.includes('渡輪'))
    if (hasHkrailAnswer && hasFerryAnswer) {
      errors.push('答案矛盾：同一練習卷中港鐵和渡輪同時出現為主要交通工具的答案')
    }
  }

  return { valid: errors.length === 0, errors }
}

function parseDeepSeekContent(content: string): DeepSeekResponse | null {
  // Strip markdown code fences if present
  let cleaned = content.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }
  try {
    return JSON.parse(cleaned) as DeepSeekResponse
  } catch {
    // Try to extract JSON object from surrounding text
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as DeepSeekResponse
      } catch {
        return null
      }
    }
    return null
  }
}

async function callDeepSeekAPI(
  systemPrompt: string,
  userPrompt: string
): Promise<DeepSeekResponse | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  const baseUrl = 'https://api.deepseek.com'

  if (!apiKey) {
    console.error('[DeepSeek] DEEPSEEK_API_KEY 未設定')
    return null
  }

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    // NOTE: frequency_penalty and presence_penalty are intentionally omitted (deprecated)
  }

  console.log(`[DeepSeek] 呼叫 API — model: ${model}, endpoint: ${baseUrl}/chat/completions`)

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[DeepSeek] API 返回非 200 狀態碼: ${response.status} — ${errorText}`)
    return null
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    console.error('[DeepSeek] API 回傳內容為空')
    return null
  }

  console.log(`[DeepSeek] 收到回傳內容（前 200 字）: ${content.substring(0, 200)}`)

  const parsed = parseDeepSeekContent(content)
  if (!parsed) {
    console.error('[DeepSeek] 無法解析 JSON 回傳內容')
    return null
  }

  return parsed
}

async function generateWithDeepSeek(params: GenerateParams): Promise<GeneratedQuestion[] | null> {
  const { knowledgeChunks, questionTypes, totalQuestions, difficulty } = params

  // Build knowledge content string
  const knowledgeContent = knowledgeChunks
    .map((c, i) => `${i + 1}. 知識點：${c.knowledge_point}\n   學習目標：${c.learning_objective}`)
    .join('\n\n')

  const grade = knowledgeChunks[0]?.year || 'P3'
  const subject = knowledgeChunks[0]?.subject || '常識科'

  const systemPrompt = buildSystemPrompt(grade, subject, questionTypes, difficulty, totalQuestions, knowledgeContent)
  const userPrompt = buildUserPrompt(questionTypes, totalQuestions)

  let lastError = ''
  const MAX_RETRIES = 2

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[DeepSeek] 嘗試第 ${attempt} 次生成題目`)

    const result = await callDeepSeekAPI(systemPrompt, userPrompt)

    if (!result) {
      lastError = `第 ${attempt} 次 API 呼叫失敗`
      console.error(`[DeepSeek] ${lastError}`)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt)) // exponential backoff
        continue
      }
      break
    }

    const { valid, errors } = validateDeepSeekResponse(result, totalQuestions, questionTypes)

    if (!valid) {
      lastError = `第 ${attempt} 次格式校驗失敗: ${errors.join('; ')}`
      console.error(`[DeepSeek] ${lastError}`)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
        continue
      }
      break
    }

    // Convert DeepSeek format → GeneratedQuestion format
    const questions: GeneratedQuestion[] = result.questions
      .slice(0, totalQuestions)
      .map((q, idx) => {
        let options: Record<string, string> | null = null

        if (q.type === 'mc' && Array.isArray(q.options)) {
          options = {}
          for (const opt of q.options) {
            const key = opt.charAt(0) // 'A', 'B', 'C', 'D'
            const value = opt.replace(/^[A-D]\.\s*/, '')
            options[key] = value
          }
        } else if (q.type === 'tf') {
          options = { A: '對', B: '錯' }
        }

        return {
          question_number: idx + 1,
          question_text: q.question_text,
          question_type: q.type,
          options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        }
      })

    console.log(`[DeepSeek] 成功生成 ${questions.length} 道題目`)
    return questions
  }

  console.error(`[DeepSeek] 所有重試均失敗，最後錯誤: ${lastError}。回退到 Mock LLM。`)
  return null
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

function generateMockQuestions(params: GenerateParams): GeneratedQuestion[] {
  const { knowledgeChunks, questionTypes, totalQuestions } = params
  const questions: GeneratedQuestion[] = []
  let qNum = 1

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

  return questions
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateQuestions(params: GenerateParams): Promise<GeneratedQuestion[]> {
  const useMock = process.env.USE_MOCK_LLM !== 'false'

  if (!useMock) {
    console.log('[LLM] USE_MOCK_LLM=false — 使用 DeepSeek API 生成題目')
    const deepSeekResult = await generateWithDeepSeek(params)
    if (deepSeekResult) {
      return deepSeekResult
    }
    // Fallback to mock if DeepSeek fails
    console.warn('[LLM] DeepSeek API 失敗，回退到 Mock LLM')
  } else {
    console.log('[LLM] USE_MOCK_LLM=true — 使用 Mock LLM 生成題目')
  }

  // ── Mock generation ───────────────────────────────────────────────────────
  await new Promise(r => setTimeout(r, 300)) // simulate API delay
  return generateMockQuestions(params)
}

export { QUESTION_TYPE_LABELS }
