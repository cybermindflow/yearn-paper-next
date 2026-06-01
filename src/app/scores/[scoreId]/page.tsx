'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import AppLayout from '@/components/AppLayout'

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

interface ScoreDetail {
  id: string
  paper_id: string
  total_questions: number
  correct_count: number
  score_percentage: number
  time_spent_seconds: number | null
  completed_at: string
  mode: string
  subject: string
  topic: string
  unit: string
}

const OBJECTIVE_TYPES = ['mc', 'tf', 'fill', 'match', 'classify']
const TYPE_LABELS: Record<string, string> = {
  mc: '選擇題', tf: '判斷題', fill: '填充題',
  match: '配對題', classify: '分類題', short: '問答題', essay: '問答題',
}

function formatTime(s: number | null) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function ScoreDetailPage() {
  const { scoreId } = useParams<{ scoreId: string }>()
  const router = useRouter()
  const [score, setScore] = useState<ScoreDetail | null>(null)
  const [questions, setQuestions] = useState<QuestionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/scores/${scoreId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setScore(d.score)
        setQuestions(d.questions || [])
      })
      .catch(() => setError('載入失敗，請稍後再試'))
      .finally(() => setLoading(false))
  }, [scoreId])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      </AppLayout>
    )
  }

  if (error || !score) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p style={{ color: 'var(--danger)' }}>{error || '找不到成績記錄'}</p>
          <button onClick={() => router.push('/scores')} className="btn-secondary mt-4">
            返回成績記錄
          </button>
        </div>
      </AppLayout>
    )
  }

  const pct = Math.round(score.score_percentage)
  const grade = pct >= 80 ? '優秀' : pct >= 60 ? '良好' : '繼續努力'
  const gradeColor = pct >= 80 ? 'var(--brand)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
  const completedDate = new Date(score.completed_at).toLocaleDateString('zh-HK', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <button onClick={() => router.push('/scores')}
          className="flex items-center gap-2 text-sm mb-4"
          style={{ color: 'var(--brand)' }}>
          <ArrowLeft size={16} /> 返回成績記錄
        </button>

        {/* AI disclaimer */}
        <div className="mb-4 p-3 rounded-xl border-l-4 border-orange-400 bg-yellow-50">
          <p className="text-xs text-yellow-800">
            <span className="font-bold">⚠️ </span>本練習卷由 AI 生成，評分結果僅供參考。建議家長核對主觀題的答案，並根據實際情況給予指導。
          </p>
        </div>

        {/* Score summary */}
        <div className="card text-center mb-6">
          <CheckCircle size={40} className="mx-auto mb-2" style={{ color: 'var(--brand)' }} />
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--brand-dark)' }}>
            {score.subject} — {score.topic}
          </h1>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{completedDate}</p>
          <div className="text-5xl font-bold my-3" style={{ color: gradeColor }}>{pct}%</div>
          <div className="badge mb-3 mx-auto" style={{ background: gradeColor + '22', color: gradeColor }}>{grade}</div>
          <div className="flex justify-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>{score.correct_count} / {score.total_questions} 題正確</span>
            <span>用時：{formatTime(score.time_spent_seconds)}</span>
          </div>
        </div>

        {/* Per-question breakdown */}
        {questions.length > 0 && (
          <div>
            <h2 className="text-base font-bold mb-3" style={{ color: 'var(--brand-dark)' }}>逐題詳情</h2>
            <div className="flex flex-col gap-3">
              {questions.map((rq) => {
                const isSubjective = !OBJECTIVE_TYPES.includes(rq.question_type)
                const correct = rq.is_correct === true
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

        {/* Bottom navigation */}
        <div className="mt-6">
          <button onClick={() => router.push('/scores')} className="btn-secondary w-full">
            返回成績記錄
          </button>
        </div>

        <p className="disclaimer mt-4 text-center">
          免責聲明：本練習卷由殷學社教育中心 AI 系統自動生成，僅供學習參考之用。
        </p>
      </div>
    </AppLayout>
  )
}
