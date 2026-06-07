'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { QuestionImage } from '@/components/QuestionImage'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, Loader2, XCircle } from 'lucide-react'

interface Question {
  id: string; question_number: number; question_text: string
  question_type: string; options: Record<string, string> | null
  correct_answer: string; explanation: string
  image_key?: string | null
}

interface QuestionResult {
  id: string
  question_number: number
  question_text: string
  question_type: string
  options: Record<string, string> | null
  correct_answer: string
  explanation: string
  child_answer: string | null
  is_correct: boolean | null
}

const OBJECTIVE_TYPES = ['mc', 'tf', 'fill', 'match', 'classify']
const TYPE_LABELS: Record<string, string> = {
  mc: '選擇題', tf: '判斷題', fill: '填充題',
  match: '配對題', classify: '分類題', short: '問答題', essay: '問答題',
}

function PracticeContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDiagnosis = searchParams.get('mode') === 'diagnosis'

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ totalQuestions: number; correctCount: number; scorePercentage: number; scoreId?: string } | null>(null)
  const [resultQuestions, setResultQuestions] = useState<QuestionResult[]>([])
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`/api/questions/${id}`)
      .then(r => r.json())
      .then(d => setQuestions(d.questions || []))
      .finally(() => setLoading(false))

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [id])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const q = questions[current]
  const isObjective = q ? OBJECTIVE_TYPES.includes(q.question_type) : false
  const allAnswered = questions.every(q => !!answers[q.id])

  const handleAnswer = (val: string) => {
    if (!q) return
    setAnswers(prev => ({ ...prev, [q.id]: val }))
  }

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/questions/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, timeSpentSeconds: elapsed }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); setSubmitting(false); return }

      // If diagnosis mode, redirect to diagnosis report page
      if (isDiagnosis && data.score?.scoreId) {
        router.push(`/diagnosis/${data.score.scoreId}`)
        return
      }

      setResult(data.score)
      setResultQuestions(data.questions || [])
      setSubmitted(true)
    } catch {
      toast.error('提交失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  // ── Result screen (non-diagnosis mode) ─────────────────────────────────────
  if (submitted && result) {
    const pct = Math.round(result.scorePercentage)
    const grade = pct >= 80 ? '優秀' : pct >= 60 ? '良好' : '繼續努力'
    const gradeColor = pct >= 80 ? 'var(--brand)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-8 fade-in"
        style={{ background: 'var(--surface)' }}>

        {/* AI disclaimer */}
        <div className="w-full max-w-2xl mb-4 p-3 rounded-xl border-l-4 border-orange-400 bg-yellow-50">
          <p className="text-xs text-yellow-800">
            <span className="font-bold">⚠️ </span>本練習卷由 AI 生成，評分結果僅供參考。建議家長核對主觀題的答案，並根據實際情況給予指導。
          </p>
        </div>

        {/* Score summary */}
        <div className="card w-full max-w-2xl text-center mb-6">
          <CheckCircle size={48} className="mx-auto mb-3" style={{ color: 'var(--brand)' }} />
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--brand-dark)' }}>作答完成！</h1>
          <div className="text-5xl font-bold my-4" style={{ color: gradeColor }}>{pct}%</div>
          <div className="badge mb-4 mx-auto" style={{ background: gradeColor + '22', color: gradeColor }}>{grade}</div>
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            {result.correctCount} / {result.totalQuestions} 題正確
          </div>
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            用時：{formatTime(elapsed)}
          </div>
        </div>

        {/* Per-question breakdown */}
        {resultQuestions.length > 0 && (
          <div className="w-full max-w-2xl mb-6">
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--brand-dark)' }}>逐題詳情</h2>
            <div className="flex flex-col gap-3">
              {resultQuestions.map((rq) => {
                const isSubjective = !OBJECTIVE_TYPES.includes(rq.question_type)
                const correct = rq.is_correct === true
                const wrong = rq.is_correct === false
                const borderColor = isSubjective ? 'var(--border)' : correct ? '#22c55e' : '#ef4444'
                const bgColor = isSubjective ? '#f9fafb' : correct ? '#f0fdf4' : '#fef2f2'
                return (
                  <div key={rq.id} className="rounded-xl border-l-4 p-4"
                    style={{ borderColor, background: bgColor }}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {isSubjective ? (
                          <AlertCircle size={20} style={{ color: 'var(--warning)' }} />
                        ) : correct ? (
                          <CheckCircle size={20} style={{ color: '#22c55e' }} />
                        ) : (
                          <XCircle size={20} style={{ color: '#ef4444' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                            第 {rq.question_number} 題
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--brand-pale)', color: 'var(--brand)' }}>
                            {TYPE_LABELS[rq.question_type] || rq.question_type}
                          </span>
                          {isSubjective && (
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: '#fff8e1', color: '#7a5c00' }}>
                              主觀題
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                          {rq.question_text}
                        </p>
                        {/* Options (for MC) */}
                        {rq.options && Object.keys(rq.options).filter(k => k.length === 1).length > 0 && (
                          <div className="flex flex-col gap-1 mb-2">
                            {Object.entries(rq.options).filter(([k]) => k.length === 1).map(([key, val]) => {
                              const isUserAnswer = rq.child_answer === key
                              const isCorrectOption = rq.correct_answer === key
                              let optStyle: React.CSSProperties = { color: 'var(--text-muted)' }
                              if (isCorrectOption) optStyle = { color: '#16a34a', fontWeight: 600 }
                              else if (isUserAnswer && !isCorrectOption) optStyle = { color: '#dc2626', textDecoration: 'line-through' }
                              return (
                                <div key={key} className="flex items-center gap-2 text-xs" style={optStyle}>
                                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={isCorrectOption
                                      ? { background: '#22c55e', color: '#fff' }
                                      : isUserAnswer
                                      ? { background: '#ef4444', color: '#fff' }
                                      : { background: '#e5e7eb', color: '#6b7280' }}>
                                    {key}
                                  </span>
                                  {val}
                                  {isCorrectOption && <span className="ml-1">✓ 正確答案</span>}
                                  {isUserAnswer && !isCorrectOption && <span className="ml-1">← 你的答案</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {/* Fill / Short answer */}
                        {!rq.options && (
                          <div className="flex flex-col gap-1 mb-2 text-xs">
                            <div style={{ color: rq.is_correct ? '#16a34a' : '#dc2626' }}>
                              你的答案：{rq.child_answer ?? '（未作答）'}
                            </div>
                            {!isSubjective && (
                              <div style={{ color: '#16a34a', fontWeight: 600 }}>
                                正確答案：{rq.correct_answer}
                              </div>
                            )}
                            {isSubjective && (
                              <div style={{ color: '#7a5c00' }}>
                                參考答案：{rq.correct_answer}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Explanation */}
                        {rq.explanation && (
                          <div className="mt-2 p-2 rounded-lg text-xs leading-relaxed"
                            style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)' }}>
                            <span className="font-semibold">解析：</span>{rq.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="w-full max-w-2xl flex flex-col gap-3 mb-6">
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
            返回儀錶板
          </button>
          <button onClick={() => router.push(`/practice/${id}`)} className="btn-secondary w-full">
            重新練習
          </button>
          {result.scoreId && (
            <button onClick={() => router.push(`/scores/${result.scoreId}`)} className="btn-secondary w-full">
              查看成績詳情
            </button>
          )}
        </div>

        <p className="disclaimer max-w-2xl text-center">
          免責聲明：本練習卷由殷學社教育中心 AI 系統自動生成，僅供學習參考之用。
        </p>
      </div>
    )
  }

  if (!q) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <p style={{ color: 'var(--text-muted)' }}>找不到題目</p>
      </div>
    )
  }

  const progressPct = ((current + 1) / questions.length) * 100

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 h-14 flex items-center justify-between"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'var(--brand)' }}>殷</div>
          <span className="text-sm font-semibold" style={{ color: 'var(--brand-dark)' }}>殷學社教育中心</span>
          {isDiagnosis && (
            <span className="text-xs px-2 py-0.5 rounded-full ml-1"
              style={{ background: 'var(--brand-pale)', color: 'var(--brand)' }}>
              診斷模式
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Clock size={14} />
          {formatTime(elapsed)}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1.5" style={{ background: 'var(--border)' }}>
        <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: 'var(--brand)' }} />
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 fade-in">
        {/* Question counter */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            第 {current + 1} / {questions.length} 題
          </span>
          <span className="badge badge-green">{TYPE_LABELS[q.question_type] || q.question_type}</span>
        </div>

        {/* Question */}
        <div className="card mb-4">
          <p className="text-base font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
            {q.question_number}. {q.question_text}
          </p>
          {q.image_key && (
            <div className="mt-3">
              <QuestionImage imageKey={q.image_key} width={320} height={240} />
            </div>
          )}
        </div>

        {/* Answer area */}
        <div className="card mb-4">
          {/* MC / TF / Classify */}
          {q.options && Object.keys(q.options).filter(k => k.length === 1).length > 0 && (
            <div className="flex flex-col gap-2">
              {Object.entries(q.options).filter(([k]) => k.length === 1).map(([key, val]) => {
                const isSelected = answers[q.id] === key
                return (
                  <button key={key} onClick={() => handleAnswer(key)}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
                    style={isSelected
                      ? { borderColor: 'var(--brand)', background: 'var(--brand-pale)' }
                      : { borderColor: 'var(--border)', background: '#fff' }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={isSelected
                        ? { background: 'var(--brand)', color: '#fff' }
                        : { background: 'var(--surface)', color: 'var(--text-muted)' }}>
                      {key}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{val}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Fill / Short / Essay */}
          {!q.options && (
            <div>
              {['fill'].includes(q.question_type) ? (
                <input type="text" value={answers[q.id] || ''}
                  onChange={e => handleAnswer(e.target.value)}
                  placeholder="請填寫答案..." className="input-field" />
              ) : (
                <textarea value={answers[q.id] || ''}
                  onChange={e => handleAnswer(e.target.value)}
                  placeholder="請填寫答案..." rows={4}
                  className="input-field resize-none" />
              )}
              {!isObjective && (
                <div className="mt-3 p-3 rounded-xl flex items-start gap-2"
                  style={{ background: '#fff8e1' }}>
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#7a5c00' }}>
                    此為主觀題，系統將顯示參考答案供核對，需由家長或老師人手評分。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrent(v => Math.max(0, v - 1))} disabled={current === 0}
            className="btn-secondary px-4 py-2">
            <ChevronLeft size={16} /> 上一題
          </button>

          <div className="flex gap-1 flex-wrap justify-center max-w-xs">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="w-7 h-7 rounded-full text-xs font-bold transition-all"
                style={i === current
                  ? { background: 'var(--brand)', color: '#fff' }
                  : answers[questions[i].id]
                  ? { background: 'var(--brand-pale)', color: 'var(--brand)' }
                  : { background: 'var(--border)', color: 'var(--text-muted)' }}>
                {i + 1}
              </button>
            ))}
          </div>

          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent(v => Math.min(questions.length - 1, v + 1))}
              className="btn-primary px-4 py-2">
              下一題 <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="btn-primary px-4 py-2"
              style={!allAnswered ? { opacity: 0.7 } : {}}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              提交作答
            </button>
          )}
        </div>

        {!allAnswered && current === questions.length - 1 && (
          <p className="text-center text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            尚有 {questions.filter(q => !answers[q.id]).length} 題未作答，仍可提交
          </p>
        )}
      </main>

      <footer className="disclaimer">
        免責聲明：本練習卷由殷學社教育中心 AI 系統自動生成，僅供學習參考之用。
        © 2026 殷學社教育中心 Yearn Hopes Education Centre. All rights reserved.
      </footer>
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    }>
      <PracticeContent />
    </Suspense>
  )
}
