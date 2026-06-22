'use client'
import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { QuestionImage } from '@/components/QuestionImage'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { toast } from 'sonner'
import { Clock, Trophy, Loader2, AlertTriangle, ChevronRight, CheckCircle, X, Grid3X3 } from 'lucide-react'

interface Question {
  id: string
  question_number: number
  question_text: string
  question_type: string
  options: Record<string, string> | null
  correct_answer: string
  explanation: string
  image_key?: string | null
}

interface Paper {
  id: string
  subject: string
  topic: string
  time_limit_minutes: number
  status: string
}

const TYPE_LABELS: Record<string, string> = {
  mc: '選擇題', tf: '判斷題', fill: '填充題',
  match: '配對題', classify: '分類題', short: '問答題', essay: '問答題',
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  unansweredNums: number[]
  onConfirm: () => void
  onGoBack: () => void
  onCancel: () => void
}

function ConfirmDialog({ unansweredNums, onConfirm, onGoBack, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ color: 'var(--brand-dark)' }}>確認提交考試</h3>
          <button onClick={onCancel} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {unansweredNums.length > 0 ? (
          <>
            <div className="flex items-start gap-2 p-3 rounded-xl mb-4"
              style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
              <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div className="text-sm" style={{ color: '#92400e' }}>
                <strong>尚有 {unansweredNums.length} 題未作答</strong>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>未作答題目：</p>
              <div className="flex flex-wrap gap-1.5">
                {unansweredNums.map(n => (
                  <span key={n}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle size={16} style={{ color: '#22c55e' }} />
            <span className="text-sm" style={{ color: '#166534' }}>所有題目均已作答！</span>
          </div>
        )}

        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          提交後不可修改，確定要交卷嗎？
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}
          >
            確認交卷
          </button>
          {unansweredNums.length > 0 && (
            <button
              onClick={onGoBack}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
              style={{ background: 'var(--surface)', border: '1.5px solid var(--brand)', color: 'var(--brand)' }}
            >
              返回作答（補答未答題）
            </button>
          )}
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl text-sm transition-all"
            style={{ color: 'var(--text-muted)' }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Navigation Panel ──────────────────────────────────────────────────────────
interface NavPanelProps {
  questions: Question[]
  answers: Record<string, string>
  lockedQuestions: Set<string>
  current: number
  onJump: (idx: number) => void
  onClose: () => void
}

function NavPanel({ questions, answers, lockedQuestions, current, onJump, onClose }: NavPanelProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl p-5 shadow-xl"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', maxHeight: '70vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: 'var(--brand-dark)' }}>題目總覽</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full" style={{ background: '#f59e0b' }} />
            <span>已鎖定</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full" style={{ background: '#86efac' }} />
            <span>已答（可改）</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
            <span>未答</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => {
            const isLocked = lockedQuestions.has(q.id)
            const isAnswered = answers[q.id] !== undefined
            const isCurrent = idx === current
            let bg = 'var(--surface)'
            let color = 'var(--text-muted)'
            let border = 'var(--border)'
            if (isLocked) { bg = '#f59e0b'; color = '#fff'; border = '#d97706' }
            else if (isAnswered) { bg = '#86efac'; color = '#166534'; border = '#22c55e' }
            if (isCurrent) { border = 'var(--brand)' }

            return (
              <button
                key={q.id}
                onClick={() => !isLocked && onJump(idx)}
                disabled={isLocked}
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: bg, color, border: `2px solid ${border}`,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  outline: isCurrent ? `2px solid var(--brand)` : 'none',
                  outlineOffset: 2,
                }}
                title={isLocked ? '已鎖定，不可返回修改' : `跳至第 ${idx + 1} 題`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Exam Content ─────────────────────────────────────────────────────────
function ExamContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [paper, setPaper] = useState<Paper | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  // lockedQuestions: questions that have been navigated away from (cannot modify)
  const [lockedQuestions, setLockedQuestions] = useState<Set<string>>(new Set())
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showNavPanel, setShowNavPanel] = useState(false)

  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [, setTimeExpired] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const autoSubmitRef = useRef(false)

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (submitting || submitted) return
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitting(true)
    setShowConfirm(false)

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
  const isLastQuestion = current === questions.length - 1
  const isWarning = timeRemaining <= 300 && timeRemaining > 0
  const isCritical = timeRemaining <= 60 && timeRemaining > 0

  // Answer handler: allow modification until question is locked
  const handleAnswer = (val: string) => {
    if (!q) return
    if (lockedQuestions.has(q.id)) return // locked: no modification
    setAnswers(prev => ({ ...prev, [q.id]: val }))
  }

  // Next: lock current question, advance
  const handleNext = () => {
    if (!q) return
    // Lock current question when moving forward
    setLockedQuestions(prev => { const s = new Set(prev); s.add(q.id); return s })
    if (current < questions.length - 1) {
      setCurrent(current + 1)
    }
  }

  // Jump to a specific question (only non-locked)
  const handleJump = (idx: number) => {
    const targetQ = questions[idx]
    if (!targetQ || lockedQuestions.has(targetQ.id)) return
    // Lock current question when jumping away
    if (q && !lockedQuestions.has(q.id)) {
      setLockedQuestions(prev => { const s = new Set(prev); s.add(q.id); return s })
    }
    setCurrent(idx)
    setShowNavPanel(false)
  }

  // Submit confirm: show dialog with unanswered list
  const handleSubmitConfirm = () => {
    setShowConfirm(true)
  }

  // Unanswered question numbers (1-based)
  const unansweredNums = questions
    .filter(q => !answers[q.id])
    .map(q => q.question_number)

  // Go back to first unanswered question
  const handleGoBack = () => {
    setShowConfirm(false)
    const firstUnanswered = questions.findIndex(q => !answers[q.id])
    if (firstUnanswered >= 0) {
      // Unlock the target question so user can answer it
      const targetQ = questions[firstUnanswered]
      setLockedQuestions(prev => {
        const next = new Set(prev)
        next.delete(targetQ.id)
        return next
      })
      setCurrent(firstUnanswered)
    }
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
  const isCurrentLocked = q ? lockedQuestions.has(q.id) : false

  return (
    <AppLayout>
      {/* Confirm Dialog */}
      {showConfirm && (
        <ConfirmDialog
          unansweredNums={unansweredNums}
          onConfirm={() => handleSubmit(false)}
          onGoBack={handleGoBack}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Navigation Panel */}
      {showNavPanel && (
        <NavPanel
          questions={questions}
          answers={answers}
          lockedQuestions={lockedQuestions}
          current={current}
          onJump={handleJump}
          onClose={() => setShowNavPanel(false)}
        />
      )}

      <div className="max-w-2xl mx-auto fade-in">
        {/* Exam header with countdown */}
        <div className="flex items-center justify-between mb-4 p-4 rounded-2xl"
          style={{
            background: isCritical ? '#fef2f2' : isWarning ? '#fffbeb' : 'var(--surface)',
            border: `2px solid ${isCritical ? '#fca5a5' : isWarning ? '#fcd34d' : 'var(--border)'}`
          }}>
          <div className="flex items-center gap-2">
            <Trophy size={20} style={{ color: '#d97706' }} />
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--brand-dark)' }}>🏆 模擬考試</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{paper.subject} · 小三</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Nav panel toggle */}
            <button
              onClick={() => setShowNavPanel(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <Grid3X3 size={14} />
              題目
            </button>
            <div className="flex items-center gap-2">
              <Clock size={18} style={{ color: isCritical ? '#ef4444' : isWarning ? '#d97706' : 'var(--text-muted)' }} />
              <span className={`font-mono font-bold text-xl ${isCritical ? 'animate-pulse' : ''}`}
                style={{ color: isCritical ? '#ef4444' : isWarning ? '#d97706' : 'var(--text)' }}>
                {formatCountdown(timeRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Warning banners */}
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
          <div className="card mb-4"
            style={isCurrentLocked ? { border: '2px solid #fcd34d', background: '#fffbeb' } : {}}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                {TYPE_LABELS[q.question_type] || q.question_type}
              </span>
              {answers[q.id] && !isCurrentLocked && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#dcfce7', color: '#166534' }}>
                  ✓ 已作答（可修改）
                </span>
              )}
              {isCurrentLocked && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#fef3c7', color: '#d97706' }}>
                  🔒 已鎖定
                </span>
              )}
            </div>

            <p className="text-base font-medium mb-4 leading-relaxed" style={{ color: 'var(--text)' }}>
              {q.question_number}. {q.question_text}
            </p>
            {q.image_key && (
              <div className="mb-4">
                <QuestionImage imageKey={q.image_key} width={320} height={240} />
              </div>
            )}

            {/* MC options */}
            {q.question_type === 'mc' && q.options && (
              <div className="flex flex-col gap-2">
                {Object.entries(q.options).map(([key, val]) => {
                  const isSelected = answers[q.id] === key
                  return (
                    <button
                      key={key}
                      onClick={() => handleAnswer(key)}
                      disabled={isCurrentLocked}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: isSelected ? '#fffbeb' : 'var(--surface)',
                        border: `2px solid ${isSelected ? '#f59e0b' : 'var(--border)'}`,
                        cursor: isCurrentLocked ? 'not-allowed' : 'pointer',
                        opacity: isCurrentLocked && !isSelected ? 0.5 : 1,
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
                  return (
                    <button
                      key={opt.val}
                      onClick={() => handleAnswer(opt.val)}
                      disabled={isCurrentLocked}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{
                        background: isSelected ? (opt.val === 'T' ? '#dcfce7' : '#fee2e2') : 'var(--surface)',
                        border: `2px solid ${isSelected ? (opt.val === 'T' ? '#22c55e' : '#ef4444') : 'var(--border)'}`,
                        color: isSelected ? (opt.val === 'T' ? '#166534' : '#991b1b') : 'var(--text)',
                        cursor: isCurrentLocked ? 'not-allowed' : 'pointer',
                        opacity: isCurrentLocked && !isSelected ? 0.5 : 1,
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
                style={{
                  border: '2px solid var(--border)',
                  background: isCurrentLocked ? '#f9fafb' : 'var(--surface)',
                  color: 'var(--text)',
                  minHeight: q.question_type === 'fill' ? 60 : 100,
                  cursor: isCurrentLocked ? 'not-allowed' : 'text',
                }}
                placeholder={isCurrentLocked ? '（已鎖定）' : q.question_type === 'fill' ? '請填寫答案...' : '請作答...'}
                value={answers[q.id] || ''}
                readOnly={isCurrentLocked}
                onChange={e => {
                  if (!isCurrentLocked) {
                    setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))
                  }
                }}
                rows={q.question_type === 'fill' ? 2 : 4}
              />
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {isCurrentLocked ? '🔒 此題已鎖定' : '⚠️ 點擊下一題後鎖定，不可返回修改'}
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
                style={{
                  background: submitting ? 'var(--border)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? '提交中...' : '提交考試'}
              </button>
            )}
          </div>
        </div>

        {/* Question dots navigator (compact, read-only status) */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {questions.map((qItem, idx) => {
            const isLocked = lockedQuestions.has(qItem.id)
            const isAnswered = answers[qItem.id] !== undefined
            const isCurr = idx === current
            let bg = 'var(--surface)'
            let color = 'var(--text-muted)'
            let border = 'var(--border)'
            if (isLocked) { bg = '#f59e0b'; color = '#fff'; border = '#d97706' }
            else if (isAnswered) { bg = '#86efac'; color = '#166534'; border = '#22c55e' }
            if (isCurr) { border = 'var(--brand)' }

            return (
              <button
                key={qItem.id}
                onClick={() => !isLocked && handleJump(idx)}
                disabled={isLocked}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                style={{
                  background: bg, color, border: `1.5px solid ${border}`,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  outline: isCurr ? `2px solid var(--brand)` : 'none',
                  outlineOffset: 1,
                }}
              >
                {idx + 1}
              </button>
            )
          })}
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
