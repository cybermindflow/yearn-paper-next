'use client'
import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { toast } from 'sonner'
import { Clock, Trophy, Loader2, AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react'

interface Question {
  id: string
  question_number: number
  question_text: string
  question_type: string
  options: Record<string, string> | null
  correct_answer: string
  explanation: string
}

interface Paper {
  id: string
  subject: string
  topic: string
  time_limit_minutes: number
  status: string
}

const OBJECTIVE_TYPES = ['mc', 'tf', 'fill', 'match', 'classify']
const TYPE_LABELS: Record<string, string> = {
  mc: '選擇題', tf: '判斷題', fill: '填充題',
  match: '配對題', classify: '分類題', short: '問答題', essay: '問答題',
}

function ExamContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [paper, setPaper] = useState<Paper | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState<number>(0) // seconds
  const [timeExpired, setTimeExpired] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const autoSubmitRef = useRef(false)

  // Track answered questions (only forward navigation)
  const [maxReached, setMaxReached] = useState(0)

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (submitting || submitted) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitting(true)

    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)

    try {
      const res = await fetch(`/api/questions/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, timeSpentSeconds: elapsed }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '提交失敗')
        setSubmitting(false)
        return
      }
      setSubmitted(true)
      if (isAutoSubmit) {
        toast.info('時間到！已自動交卷')
      } else {
        toast.success('考試已提交！')
      }
      // Navigate to result page
      setTimeout(() => {
        router.push(`/exam/${id}/result`)
      }, 1500)
    } catch {
      toast.error('網絡錯誤，請重試')
      setSubmitting(false)
    }
  }, [submitting, submitted, id, answers, router])

  useEffect(() => {
    fetch(`/api/papers/${id}`)
      .then(r => r.json())
      .then(d => {
        setPaper(d.paper)
        setQuestions(d.questions || [])
        const limitMinutes = d.paper?.time_limit_minutes || 45
        setTimeRemaining(limitMinutes * 60)
        startTimeRef.current = Date.now()
      })
      .finally(() => setLoading(false))
  }, [id])

  // Start countdown after questions loaded
  useEffect(() => {
    if (questions.length === 0 || timeRemaining === 0) return
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setTimeExpired(true)
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true
            // Auto submit
            handleSubmit(true)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [questions.length, handleSubmit]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = questions[current]
  const isObjective = q ? OBJECTIVE_TYPES.includes(q.question_type) : false
  const isLastQuestion = current === questions.length - 1
  const isWarning = timeRemaining <= 300 && timeRemaining > 0 // last 5 minutes
  const isCritical = timeRemaining <= 60 && timeRemaining > 0 // last 1 minute

  const handleAnswer = (val: string) => {
    if (!q) return
    // In exam mode: only allow setting answer once (no modification after moving forward)
    if (answers[q.id] !== undefined) return
    setAnswers(prev => ({ ...prev, [q.id]: val }))
  }

  const handleNext = () => {
    if (current < questions.length - 1) {
      const next = current + 1
      setCurrent(next)
      setMaxReached(prev => Math.max(prev, next))
    }
  }

  const handleSubmitConfirm = () => {
    const unanswered = questions.filter(q => !answers[q.id]).length
    if (unanswered > 0) {
      const ok = window.confirm(`還有 ${unanswered} 題未作答，確定要提交嗎？`)
      if (!ok) return
    }
    handleSubmit(false)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
          <p style={{ color: 'var(--text-muted)' }}>正在載入考試...</p>
        </div>
      </AppLayout>
    )
  }

  if (!paper || questions.length === 0) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p style={{ color: 'var(--text-muted)' }}>找不到考試卷</p>
        </div>
      </AppLayout>
    )
  }

  if (submitted) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <CheckCircle size={48} style={{ color: '#22c55e' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--brand-dark)' }}>考試已提交！</h2>
          <p style={{ color: 'var(--text-muted)' }}>正在跳轉至考試報告...</p>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      </AppLayout>
    )
  }

  const answeredCount = Object.keys(answers).length

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto fade-in">
        {/* Exam header with countdown */}
        <div className="flex items-center justify-between mb-4 p-4 rounded-2xl"
          style={{ background: isCritical ? '#fef2f2' : isWarning ? '#fffbeb' : 'var(--surface)', border: `2px solid ${isCritical ? '#fca5a5' : isWarning ? '#fcd34d' : 'var(--border)'}` }}>
          <div className="flex items-center gap-2">
            <Trophy size={20} style={{ color: '#d97706' }} />
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--brand-dark)' }}>🏆 模擬考試</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{paper.subject} · 小三</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: isCritical ? '#ef4444' : isWarning ? '#d97706' : 'var(--text-muted)' }} />
            <span className={`font-mono font-bold text-xl ${isCritical ? 'animate-pulse' : ''}`}
              style={{ color: isCritical ? '#ef4444' : isWarning ? '#d97706' : 'var(--text)' }}>
              {formatCountdown(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Warning banner */}
        {isWarning && !isCritical && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
            style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
            <AlertTriangle size={16} style={{ color: '#d97706' }} />
            <span className="text-sm" style={{ color: '#92400e' }}>剩餘不足 5 分鐘！</span>
          </div>
        )}
        {isCritical && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 animate-pulse"
            style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            <span className="text-sm font-semibold" style={{ color: '#991b1b' }}>最後 1 分鐘！請盡快作答</span>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            第 {current + 1} 題 / 共 {questions.length} 題
          </span>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            已答 {answeredCount} / {questions.length}
          </span>
        </div>
        <div className="w-full rounded-full h-2 mb-4" style={{ background: 'var(--border)' }}>
          <div className="h-2 rounded-full transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
        </div>

        {/* Question card */}
        {q && (
          <div className="card mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                {TYPE_LABELS[q.question_type] || q.question_type}
              </span>
              {answers[q.id] && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#dcfce7', color: '#166534' }}>
                  ✓ 已作答
                </span>
              )}
            </div>

            <p className="text-base font-medium mb-4 leading-relaxed" style={{ color: 'var(--text)' }}>
              {q.question_number}. {q.question_text}
            </p>

            {/* MC options */}
            {q.question_type === 'mc' && q.options && (
              <div className="flex flex-col gap-2">
                {Object.entries(q.options).map(([key, val]) => {
                  const isSelected = answers[q.id] === key
                  const isLocked = answers[q.id] !== undefined
                  return (
                    <button
                      key={key}
                      onClick={() => !isLocked && handleAnswer(key)}
                      disabled={isLocked}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: isSelected ? '#fffbeb' : 'var(--surface)',
                        border: `2px solid ${isSelected ? '#f59e0b' : 'var(--border)'}`,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked && !isSelected ? 0.6 : 1,
                      }}
                    >
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: isSelected ? '#f59e0b' : 'var(--border)', color: isSelected ? '#fff' : 'var(--text-muted)' }}>
                        {key}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{val}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* TF options */}
            {q.question_type === 'tf' && (
              <div className="flex gap-3">
                {[{ val: 'T', label: '✓ 正確' }, { val: 'F', label: '✗ 錯誤' }].map(opt => {
                  const isSelected = answers[q.id] === opt.val
                  const isLocked = answers[q.id] !== undefined
                  return (
                    <button
                      key={opt.val}
                      onClick={() => !isLocked && handleAnswer(opt.val)}
                      disabled={isLocked}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{
                        background: isSelected ? (opt.val === 'T' ? '#dcfce7' : '#fee2e2') : 'var(--surface)',
                        border: `2px solid ${isSelected ? (opt.val === 'T' ? '#22c55e' : '#ef4444') : 'var(--border)'}`,
                        color: isSelected ? (opt.val === 'T' ? '#166534' : '#991b1b') : 'var(--text)',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        opacity: isLocked && !isSelected ? 0.6 : 1,
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Fill / Short answer */}
            {(q.question_type === 'fill' || q.question_type === 'short' || q.question_type === 'essay') && (
              <textarea
                className="w-full p-3 rounded-xl text-sm resize-none"
                style={{ border: '2px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', minHeight: q.question_type === 'fill' ? 60 : 100 }}
                placeholder={q.question_type === 'fill' ? '請填寫答案...' : '請作答...'}
                value={answers[q.id] || ''}
                onChange={e => {
                  if (answers[q.id] !== undefined && q.question_type !== 'fill' && q.question_type !== 'short' && q.question_type !== 'essay') return
                  setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))
                }}
                rows={q.question_type === 'fill' ? 2 : 4}
              />
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ⚠️ 不可返回修改已作答題目
          </div>
          <div className="flex gap-2">
            {!isLastQuestion ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
                style={{ background: 'var(--brand)', color: '#fff' }}
              >
                下一題
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmitConfirm}
                disabled={submitting}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
                style={{ background: submitting ? 'var(--border)' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
                {submitting ? '提交中...' : '提交考試'}
              </button>
            )}
          </div>
        </div>

        {/* Question dots navigator (read-only, shows answered status) */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                background: answers[questions[idx].id]
                  ? '#f59e0b'
                  : idx === current
                    ? 'var(--brand)'
                    : 'var(--surface)',
                color: answers[questions[idx].id] || idx === current ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${idx === current ? 'var(--brand)' : 'var(--border)'}`,
              }}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      </AppLayout>
    }>
      <ExamContent />
    </Suspense>
  )
}
