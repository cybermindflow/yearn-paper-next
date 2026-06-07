import { KnowledgeChunk } from './knowledgeBase'

export interface GeneratedQuestion {
  question_number: number
  question_text: string
  question_type: string
  options: Record<string, string> | null
  correct_answer: string
  explanation: string
  image_key?: string | null
}

export interface GenerateParams {
  knowledgeChunks: KnowledgeChunk[]
  questionTypes: string[]
  totalQuestions: number
  difficulty: number
  previousQuestions?: string[] // 最近 5 次針對練習中已出現過的題目文字，用於避免重複
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mc: '選擇題',
  tf: '判斷題',
  fill: '填充題',
  match: '配對題',
  classify: '分類題',
  short: '問答題',
  essay: '問答題',
  dictation: '默寫題',
  reorder: '排列句子',
  comprehension: '閱讀理解',
  composition: '寫作題',
  label: '標示題',
  experiment: '實驗設計題',
  image_mc: '看圖選擇題',
}

// ── DeepSeek API types ────────────────────────────────────────────────────────

interface DeepSeekQuestion {
  type: 'mc' | 'tf' | 'short' | 'image_mc'
  question_text: string
  options?: string[]
  correct_answer: string
  explanation: string
  image_key?: string
}

interface DeepSeekResponse {
  questions: DeepSeekQuestion[]
}

// ── DeepSeek API caller ───────────────────────────────────────────────────────

function buildMathSystemPrompt(
  grade: string,
  questionTypes: string[],
  difficulty: number,
  totalQuestions: number,
  knowledgeContent: string,
  previousQuestions?: string[]
): string {
  const typeLabels = questionTypes.map(t => QUESTION_TYPE_LABELS[t] || t).join('、')
  const levelDesc = difficulty === 1
    ? 'L1 基礎：直接計算，數字範圍小，單步驟推理'
    : difficulty === 2
    ? 'L2 標準：含進位/退位或單位換算，數字範圍中等'
    : 'L3 挑戰：數字範圍大、需多步驟推理的應用題'

  return `你是一位香港小學數學科教育專家。請根據以下提供的知識點內容，為香港小學${grade}數學科學生生成練習題。

【嚴格要求】
1. 只使用下方「知識庫內容」中提供的知識點來生成題目。
2. 題目必須嚴格對齊香港教育局《小學數學科課程指引》的學習目標。
3. 題型：${typeLabels}
4. 難度：${levelDesc}
5. 生成 ${totalQuestions} 道題目
6. 使用繁體中文
7. 題目內容必須貼近香港學生的日常生活情境（如買東西、乘車、學校生活）

【數學題目要求】
- 選擇題（mc）：4 個選項，必須包含具體數字答案，不得出現「以上皆是」或「以上皆非」選項
- 填充題（fill）：答案必須是具體數字或單位，不得是模糊表述
- 問答題（short）：必須包含完整的計算步驟
- 判斷題（tf）：陳述必須清晰，答案為「對」或「錯」
- 看圖選擇題（image_mc）：題目文字描述圖形，並在 image_key 欄位填入對應圖形代碼（如 right_triangle、clock、number_line、cuboid、angle_types 等），4 個選項
- 所有數字必須經過驗算，確保算術正確

【輸出格式】
請嚴格按照以下 JSON 格式輸出（只輸出 JSON，不要任何其他文字）：
{
  "questions": [
    {
      "type": "mc",
      "level": "L1",
      "knowledge_point_id": "M3_04_L1",
      "question_text": "題目文字",
      "options": ["A. 選項一", "B. 選項二", "C. 選項三", "D. 選項四"],
      "correct_answer": "A",
      "explanation": "計算步驟說明"
    },
    {
      "type": "fill",
      "level": "L2",
      "knowledge_point_id": "M3_04_L2",
      "question_text": "題目文字",
      "correct_answer": "答案",
      "explanation": "解釋"
    },
    {
      "type": "image_mc",
      "level": "L1",
      "knowledge_point_id": "M3_04_L1",
      "question_text": "觀察右圖，這個圖形有多少條邊？",
      "image_key": "right_triangle",
      "options": ["A. 2", "B. 3", "C. 4", "D. 5"],
      "correct_answer": "B",
      "explanation": "直角三角形有 3 條邊"
    }
  ]
}

【知識庫內容】
${knowledgeContent}

【答案正確性要求】
- 所有數字計算必須經過驗算，確保算術正確
- 選擇題的正確答案必須包含在四個選項中
- 同一份練習卷中，涉及同一知識點的題目答案必須一致，不得互相矛盾
- 在生成所有題目後，請自行檢查所有計算是否正確

【注意】
- 只輸出 JSON，不要任何前缀或後綴
- 選擇題的選項必須以 "A. "、"B. "、"C. "、"D. " 開頭
- 每道題必須有 explanation，說明計算步驟${previousQuestions && previousQuestions.length > 0 ? `

【避免重複題目】
本次為針對練習。以下是該學生最近 5 次針對練習中已出現過的題目列表（僅供參考，避免生成完全相同的題目，但可出現相似知識點的不同題目）：
${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}`
}

function buildChineseSystemPrompt(
  grade: string,
  questionTypes: string[],
  difficulty: number,
  totalQuestions: number,
  knowledgeContent: string,
  previousQuestions?: string[]
): string {
  const typeLabels = questionTypes.map(t => QUESTION_TYPE_LABELS[t] || t).join('、')
  const levelDesc = difficulty === 1
    ? 'L1 基礎：詞語認識、簡單句子理解'
    : difficulty === 2
    ? 'L2 標準：段落理解、詞語運用'
    : 'L3 挑戰：篇章分析、創意寫作'

  return `你是一位香港小學中文科教育專家。請根據以下提供的知識點內容，為香港小學${grade}中文科學生生成練習題。

【嚴格要求】
1. 只使用下方「知識庫內容」中提供的知識點來生成題目。
2. 題目必須嚴格對齊香港教育局《小學中文科課程指引》的學習目標。
3. 題型：${typeLabels}
4. 難度：${levelDesc}
5. 生成 ${totalQuestions} 道題目
6. 使用繁體中文
7. 題目內容必須貼近香港學生的日常生活情境

【中文科題型說明】
- mc：選擇題（4 個選項，測試字詞理解或語法知識）
- fill：填充題（填入正確詞語、標點或字詞）
- dictation：默寫題（提供句子，學生默寫指定詞語）
- reorder：排列句子（打亂順序的句子，學生重新排列）
- comprehension：閱讀理解（提供短文，然後出 2-3 道問題）
- composition：寫作題（提供題目或圖片描述，學生寫短文）
- short：問答題（根據語文知識回答）
- image_mc：看圖選擇題（題目描述圖形，image_key 填入對應代碼，如 stroke_order、sentence_structure、metaphor_simile）

【輸出格式】
請嚴格按照以下 JSON 格式輸出（只輸出 JSON，不要任何其他文字）：
{
  "questions": [
    {
      "type": "mc",
      "question_text": "題目文字",
      "options": ["A. 選項一", "B. 選項二", "C. 選項三", "D. 選項四"],
      "correct_answer": "A",
      "explanation": "解釋為什麼這是正確答案"
    },
    {
      "type": "dictation",
      "question_text": "請默寫以下詞語：＿＿＿＿",
      "correct_answer": "詞語答案",
      "explanation": "解釋"
    },
    {
      "type": "comprehension",
      "question_text": "短文：...\n問題：...",
      "correct_answer": "參考答案",
      "explanation": "解釋"
    }
  ]
}

【知識庫內容】
${knowledgeContent}

【注意】
- 只輸出 JSON，不要任何前缀或後綴
- 選擇題的選項必須以 "A. "、"B. "、"C. "、"D. " 開頭
- 每道題必須有 explanation
- 閱讀理解題請在 question_text 中包含完整短文${previousQuestions && previousQuestions.length > 0 ? `

【避免重複題目】
以下是該學生最近 5 次練習中已出現過的題目列表（避免生成完全相同的題目）：
${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}`
}

function buildScienceSystemPrompt(
  grade: string,
  questionTypes: string[],
  difficulty: number,
  totalQuestions: number,
  knowledgeContent: string,
  previousQuestions?: string[]
): string {
  const typeLabels = questionTypes.map(t => QUESTION_TYPE_LABELS[t] || t).join('、')
  const levelDesc = difficulty === 1
    ? 'L1 基礎：基本概念識別、簡單觀察'
    : difficulty === 2
    ? 'L2 標準：概念應用、實驗分析'
    : 'L3 挑戰：跨概念推理、實驗設計'

  return `你是一位香港小學科學科教育專家。請根據以下提供的知識點內容，為香港小學${grade}科學科學生生成練習題。

【嚴格要求】
1. 只使用下方「知識庫內容」中提供的知識點來生成題目。
2. 題目必須嚴格對齊香港教育局《小學科學科課程指引》的學習目標。
3. 題型：${typeLabels}
4. 難度：${levelDesc}
5. 生成 ${totalQuestions} 道題目
6. 使用繁體中文
7. 題目內容必須貼近香港學生的日常生活情境和科學探究精神

【科學科題型說明】
- mc：選擇題（4 個選項，測試科學概念理解）
- tf：判斷題（判斷科學陳述是否正確，答案為「對」或「錯」）
- fill：填充題（填入科學詞語、單位或數值）
- label：標示題（描述圖表結構，學生填寫標籤名稱）
- experiment：實驗設計題（描述實驗情境，學生分析或設計實驗步驟）
- short：問答題（解釋科學現象，2-3 句）
- essay：問答題（深入分析科學概念，段落式作答）
- image_mc：看圖選擇題（題目描述圖形，image_key 填入對應代碼，如 plant_structure、simple_circuit、water_cycle、states_of_matter、magnet）

【輸出格式】
請嚴格按照以下 JSON 格式輸出（只輸出 JSON，不要任何其他文字）：
{
  "questions": [
    {
      "type": "mc",
      "question_text": "題目文字",
      "options": ["A. 選項一", "B. 選項二", "C. 選項三", "D. 選項四"],
      "correct_answer": "A",
      "explanation": "解釋科學原理"
    },
    {
      "type": "experiment",
      "question_text": "實驗情境描述...\n問題：...",
      "correct_answer": "參考答案",
      "explanation": "解釋實驗原理"
    }
  ]
}

【知識庫內容】
${knowledgeContent}

【注意】
- 只輸出 JSON，不要任何前缀或後綴
- 選擇題的選項必須以 "A. "、"B. "、"C. "、"D. " 開頭
- 每道題必須有 explanation，說明科學原理
- 所有科學事實必須準確，不得出現錯誤的科學概念${previousQuestions && previousQuestions.length > 0 ? `

【避免重複題目】
以下是該學生最近 5 次練習中已出現過的題目列表（避免生成完全相同的題目）：
${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}`
}

function buildEnglishSystemPrompt(
  grade: string,
  questionTypes: string[],
  difficulty: number,
  totalQuestions: number,
  knowledgeContent: string,
  previousQuestions?: string[]
): string {
  const levelDesc = difficulty === 1
    ? 'L1 Foundation: basic vocabulary recognition, simple sentence comprehension'
    : difficulty === 2
    ? 'L2 Standard: grammar application, reading comprehension, sentence construction'
    : 'L3 Challenge: extended reading, creative writing, complex grammar'

  return `You are a Hong Kong primary school English teacher. Generate English practice questions for Primary ${grade.replace('P', '')} students based on the knowledge points provided below.

[STRICT REQUIREMENTS]
1. Only use the knowledge points provided in the "Knowledge Base" section below.
2. Questions must align with the Hong Kong Education Bureau English Language Curriculum Guide (Primary 1-6).
3. Question types: ${questionTypes.join(', ')}
4. Difficulty: ${levelDesc}
5. Generate ${totalQuestions} questions
6. Questions must be in ENGLISH. Explanations ("explanation" field) must be in Traditional Chinese (繁體中文).
7. Vocabulary and topics must be appropriate for Hong Kong Primary ${grade.replace('P', '')} students

[QUESTION TYPE GUIDE]
- mc: Multiple Choice (4 options A/B/C/D, test vocabulary or grammar knowledge)
- fill: Fill in the blanks (fill in the correct word or phrase)
- tf: True or False (state is true or false, answer is "True" or "False")
- match: Matching (match words with meanings, pictures, or categories)
- reorder: Rearrange words (rearrange scrambled words to form a correct sentence)
- comprehension: Reading Comprehension (provide a short passage 80-120 words, then ask 2-3 questions)
- image_mc: Picture-based Multiple Choice (describe the image in question_text, set image_key to the image code such as alphabet_case, tense_comparison, parts_of_speech, paragraph_structure)

[OUTPUT FORMAT]
Output ONLY valid JSON in the following format (no other text):
{
  "questions": [
    {
      "type": "mc",
      "question_text": "Question text in English",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "correct_answer": "A",
      "explanation": "繁體中文解釋"
    },
    {
      "type": "comprehension",
      "question_text": "Read the following passage and answer the questions.\n\n[Passage]\nPassage text here...\n\n[Questions]\n1. Question one?\n2. Question two?",
      "correct_answer": "1. Answer one\n2. Answer two",
      "explanation": "繁體中文解釋"
    }
  ]
}

[Knowledge Base]
${knowledgeContent}

[NOTES]
- Output ONLY JSON, no prefix or suffix text
- Multiple choice options must start with "A. ", "B. ", "C. ", "D. "
- Every question must have an "explanation" field in Traditional Chinese
- Vocabulary must be appropriate for Primary ${grade.replace('P', '')} level${previousQuestions && previousQuestions.length > 0 ? `

[AVOID REPETITION]
The following questions have appeared in the student's recent 5 practice sessions. Do NOT generate identical questions:
${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}`
}

function buildSystemPrompt(
  grade: string,
  subject: string,
  questionTypes: string[],
  difficulty: number,
  totalQuestions: number,
  knowledgeContent: string,
  previousQuestions?: string[]
): string {
  // Use math-specific prompt for 數學科
  if (subject === '數學科') {
    return buildMathSystemPrompt(grade, questionTypes, difficulty, totalQuestions, knowledgeContent, previousQuestions)
  }
  // Use Chinese-specific prompt for 中文科
  if (subject === '中文科') {
    return buildChineseSystemPrompt(grade, questionTypes, difficulty, totalQuestions, knowledgeContent, previousQuestions)
  }
  // Use Science-specific prompt for 科學科
  if (subject === '科學科') {
    return buildScienceSystemPrompt(grade, questionTypes, difficulty, totalQuestions, knowledgeContent, previousQuestions)
  }
  // Use English-specific prompt for 英文科
  if (subject === '英文科') {
    return buildEnglishSystemPrompt(grade, questionTypes, difficulty, totalQuestions, knowledgeContent, previousQuestions)
  }

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
- 只輸出 JSON，不要任何前缀或後綴
- 選擇題的選項必須以 "A. "、"B. "、"C. "、"D. " 開頭
- 每道題必須有 explanation${previousQuestions && previousQuestions.length > 0 ? `

【避免重複題目】
本次為針對練習。以下是該學生最近 5 次針對練習中已出現過的題目列表（僅供參考，避免生成完全相同的題目，但可出現相似知識點的不同題目）：
${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}`
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

  const validTypes = new Set(['mc', 'tf', 'short', 'fill', 'essay', 'image_mc', 'label', 'experiment', 'dictation', 'reorder', 'comprehension', 'composition'])
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

  const systemPrompt = buildSystemPrompt(grade, subject, questionTypes, difficulty, totalQuestions, knowledgeContent, params.previousQuestions)
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

        if ((q.type === 'mc' || q.type === 'image_mc') && Array.isArray(q.options)) {
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
          image_key: q.image_key || null,
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

// Map subject to relevant image keys for mock image_mc generation
const SUBJECT_IMAGE_KEYS: Record<string, string[]> = {
  '數學科': ['right_triangle', 'square', 'rectangle', 'circle', 'clock', 'number_line', 'cuboid', 'angle_types', 'compass_rose', 'multiplication_table'],
  '科學科': ['plant_structure', 'simple_circuit', 'water_cycle', 'states_of_matter', 'simple_food_chain', 'force_push_pull', 'magnet', 'five_senses', 'light_and_shadow', 'inclined_plane'],
  '常識科': ['traffic_light', 'stop_sign', 'zebra_crossing', 'hk_simple_map', 'community_facilities', 'mtr_train', 'weather_symbols', 'family_tree'],
  '中文科': ['stroke_order', 'sentence_structure', 'metaphor_simile'],
  '英文科': ['alphabet_case', 'tense_comparison', 'paragraph_structure', 'parts_of_speech'],
}
const DEFAULT_IMAGE_KEYS = ['right_triangle', 'clock', 'circle', 'square', 'number_line']

function getImageKeyForChunk(chunk: KnowledgeChunk): string {
  const keys = SUBJECT_IMAGE_KEYS[chunk.subject] || DEFAULT_IMAGE_KEYS
  // Pick a deterministic key based on knowledge_point length
  const idx = chunk.knowledge_point.length % keys.length
  return keys[idx]
}

function generateImageMCQuestion(chunk: KnowledgeChunk, num: number): GeneratedQuestion {
  const imageKey = getImageKeyForChunk(chunk)
  return {
    question_number: num,
    question_text: `請觀察圖形，判斷它與「${chunk.knowledge_point}」的哪一項描述符合？`,
    question_type: 'image_mc',
    options: {
      A: `圖形展示了${chunk.knowledge_point}的主要特徵`,
      B: `圖形與${chunk.knowledge_point}完全無關`,
      C: `圖形只適用於高年級學生`,
      D: `圖形表示的是其他科目的內容`,
    },
    correct_answer: 'A',
    explanation: `圖形展示了${chunk.knowledge_point}的相關內容。${chunk.learning_objective}`,
    image_key: imageKey,
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
    case 'image_mc': return generateImageMCQuestion(chunk, num)
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
