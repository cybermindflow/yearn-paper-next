'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Question {
  id: string; question_number: number; question_text: string
  question_type: string; options: Record<string, string> | null
  correct_answer: string; explanation: string
}

const OBJECTIVE_TYPES = ['mc', 'tf', 'fill', 'match', 'classify']
const TYPE_LABELS: Record<string, string> = {
  mc: '選擇題', tf: '判斷題', fill: '填充題',
  match: '配對題', classify: '分類題', short: '問答題', essay: '問答題',
}

export default function PracticePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ totalQuestions: number; correctCount: number; scorePercentage: number } | null>(null)
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
      if (!res.ok) { toast.error(data.error); return }
      setResult(data.score)
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

  // ── Result screen ─────────────────────────────────────────────────────────
  if (submitted && result) {
    const pct = Math.round(result.scorePercentage)
    const grade = pct >= 80 ? '優秀' : pct >= 60 ? '良好' : '繼續努力'
    const gradeColor = pct >= 80 ? 'var(--brand)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 fade-in"
        style={{ background: 'var(--surface)' }}>
        {/* Disclaimer above score */}
        <div className="w-full max-w-sm mb-4 p-3 rounded-xl border-l-4 border-orange-400 bg-yellow-50">
          <p className="text-xs text-yellow-800">
            <span className="font-bold">⚠️ </span>本練習卷由 AI 生成，評分結果僅供參考。建議家長核對主觀題的答案，並根據實際情況給予指導。
          </p>
        </div>
        <div className="card w-full max-w-sm text-center">
          <CheckCircle size={48} className="mx-auto mb-3" style={{ color: 'var(--brand)' }} />
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--brand-dark)' }}>作答完成！</h1>
          <div className="text-5xl font-bold my-4" style={{ color: gradeColor }}>{pct}%</div>
          <div className="badge mb-4 mx-auto" style={{ background: gradeColor + '22', color: gradeColor }}>{grade}</div>
          <div className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            {result.correctCount} / {result.totalQuestions} 題正確
          </div>
          <div className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            用時：{formatTime(elapsed)}
          </div>
          <button onClick={() => router.push('/dashboard')} className="btn-primary w-full">
            返回儀錶板
          </button>
        </div>
        <p className="disclaimer mt-4 max-w-sm text-center">
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

  const progress = ((current + 1) / questions.length) * 100

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 h-14 flex items-center justify-between"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'var(--brand)' }}>殷</div>
          <span className="text-sm font-semibold" style={{ color: 'var(--brand-dark)' }}>殷學社教育中心</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Clock size={14} />
          {formatTime(elapsed)}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1.5" style={{ background: 'var(--border)' }}>
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--brand)' }} />
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

          <div className="flex gap-1">
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
