'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { Trophy, Clock, BarChart2, ChevronDown, ChevronUp, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ExamResult {
  paper: {
    id: string
    subject: string
    grade: string
    timeLimitMinutes: number
    generatedAt: string
  }
  score: {
    id: string
    totalQuestions: number
    correctCount: number
    scorePercentage: number
    timeSpentSeconds: number
    completedAt: string
  }
  timeAnalysis: {
    totalSeconds: number
    avgPerQuestion: number
    mcCount: number
    tfCount: number
    fillCount: number
    shortCount: number
  }
  knowledgeResults: Array<{
    id: string
    name: string
    correct: number
    total: number
    percentage: number
  }>
  questions: Array<{
    id: string
    question_number: number
    question_text: string
    question_type: string
    options: Record<string, string> | null
    correct_answer: string
    explanation: string
    child_answer: string | null
    is_correct: boolean | null
  }>
}

const TYPE_LABELS: Record<string, string> = {
  mc: '選擇題', tf: '判斷題', fill: '填充題',
  match: '配對題', classify: '分類題', short: '問答題', essay: '問答題',
}

function formatSeconds(s: number) {
  if (!s) return '--'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m} 分 ${sec} 秒`
}

function ScoreGrade({ pct }: { pct: number }) {
  if (pct >= 90) return <span style={{ color: '#16a34a' }}>優秀 🌟</span>
  if (pct >= 75) return <span style={{ color: '#2563eb' }}>良好 👍</span>
  if (pct >= 60) return <span style={{ color: '#d97706' }}>合格 📚</span>
  return <span style={{ color: '#dc2626' }}>需加強 💪</span>
}

function ResultContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [result, setResult] = useState<ExamResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/exam/${id}/result`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setResult(d)
      })
      .catch(() => setError('載入失敗'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
          <p style={{ color: 'var(--text-muted)' }}>載入考試報告...</p>
        </div>
      </AppLayout>
    )
  }

  if (error || !result) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p style={{ color: 'var(--text-muted)' }}>{error || '找不到考試報告'}</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary mt-4">返回儀錶板</button>
        </div>
      </AppLayout>
    )
  }

  const { paper, score, timeAnalysis, knowledgeResults, questions } = result
  const pct = Math.round(score.scorePercentage)
  const completedDate = new Date(score.completedAt).toLocaleDateString('zh-HK', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Trophy size={24} color="#fff" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-dark)' }}>🏆 考試報告</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {paper.subject} · 小三 · {completedDate}
            </p>
          </div>
        </div>

        {/* Score overview */}
        <div className="card mb-4" style={{ border: `2px solid ${pct >= 75 ? '#86efac' : pct >= 60 ? '#fcd34d' : '#fca5a5'}` }}>
          <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--brand-dark)' }}>
            <BarChart2 size={18} style={{ color: 'var(--brand)' }} />
            📊 成績總覽
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 rounded-xl" style={{ background: 'var(--surface)' }}>
              <div className="text-4xl font-black mb-1" style={{ color: pct >= 75 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626' }}>
                {pct}%
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>正確率</div>
              <div className="text-sm font-semibold mt-1">
                <ScoreGrade pct={pct} />
              </div>
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>總題數</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{score.totalQuestions} 題</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>正確</span>
                <span className="font-semibold" style={{ color: '#16a34a' }}>{score.correctCount} 題</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>錯誤</span>
                <span className="font-semibold" style={{ color: '#dc2626' }}>{score.totalQuestions - score.correctCount} 題</span>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full rounded-full h-3" style={{ background: 'var(--border)' }}>
            <div className="h-3 rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct >= 75 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }} />
          </div>
        </div>

        {/* Time analysis */}
        <div className="card mb-4">
          <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--brand-dark)' }}>
            <Clock size={18} style={{ color: 'var(--brand)' }} />
            ⏱️ 時間分析
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
              <span style={{ color: 'var(--text-muted)' }}>考試時限</span>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>{paper.timeLimitMinutes} 分鐘</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
              <span style={{ color: 'var(--text-muted)' }}>實際用時</span>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>{formatSeconds(timeAnalysis.totalSeconds)}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
              <span style={{ color: 'var(--text-muted)' }}>平均每題</span>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>{timeAnalysis.avgPerQuestion} 秒</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
              <span style={{ color: 'var(--text-muted)' }}>完成時間</span>
              <span className="font-semibold" style={{ color: 'var(--text)' }}>
                {score.timeSpentSeconds && paper.timeLimitMinutes
                  ? `${Math.round((score.timeSpentSeconds / (paper.timeLimitMinutes * 60)) * 100)}%`
                  : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Knowledge point performance */}
        {knowledgeResults.length > 0 && (
          <div className="card mb-4">
            <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--brand-dark)' }}>
              📋 知識點表現
            </h2>
            <div className="flex flex-col gap-2">
              {knowledgeResults.map(kp => {
                const icon = kp.percentage >= 80 ? '🟢' : kp.percentage >= 50 ? '🟡' : '🔴'
                return (
                  <div key={kp.id} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'var(--surface)' }}>
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{kp.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full" style={{ background: 'var(--border)' }}>
                        <div className="h-2 rounded-full"
                          style={{ width: `${kp.percentage}%`, background: kp.percentage >= 80 ? '#22c55e' : kp.percentage >= 50 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className="text-sm font-semibold w-16 text-right" style={{ color: 'var(--text)' }}>
                        {kp.percentage}%（{kp.correct}/{kp.total}）
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Per-question details (collapsible) */}
        <div className="card mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between font-bold"
            style={{ color: 'var(--brand-dark)' }}
          >
            <span>📝 逐題詳情（{questions.length} 題）</span>
            {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showDetails && (
            <div className="mt-4 flex flex-col gap-4">
              {questions.map(q => {
                const isObjective = ['mc', 'tf', 'fill', 'match', 'classify'].includes(q.question_type)
                const icon = q.is_correct === true
                  ? <CheckCircle size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
                  : q.is_correct === false
                    ? <XCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                    : <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />

                return (
                  <div key={q.id} className="p-4 rounded-xl"
                    style={{ background: q.is_correct === true ? '#f0fdf4' : q.is_correct === false ? '#fef2f2' : '#fffbeb', border: `1px solid ${q.is_correct === true ? '#bbf7d0' : q.is_correct === false ? '#fecaca' : '#fde68a'}` }}>
                    <div className="flex items-start gap-2 mb-2">
                      {icon}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                            {TYPE_LABELS[q.question_type] || q.question_type}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>第 {q.question_number} 題</span>
                        </div>
                        <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{q.question_text}</p>

                        {/* MC: show options with correct/wrong highlights */}
                        {q.question_type === 'mc' && q.options && (
                          <div className="flex flex-col gap-1 mb-2">
                            {Object.entries(q.options).map(([key, val]) => {
                              const isCorrect = key === q.correct_answer
                              const isChild = key === q.child_answer
                              return (
                                <div key={key} className="flex items-center gap-2 text-xs p-1.5 rounded-lg"
                                  style={{ background: isCorrect ? '#dcfce7' : isChild && !isCorrect ? '#fee2e2' : 'transparent' }}>
                                  <span className="font-bold w-4">{key}</span>
                                  <span style={{ textDecoration: isChild && !isCorrect ? 'line-through' : 'none', color: isCorrect ? '#166534' : isChild && !isCorrect ? '#991b1b' : 'var(--text)' }}>
                                    {val}
                                  </span>
                                  {isCorrect && <span className="ml-auto text-green-600 font-semibold">✓ 正確</span>}
                                  {isChild && !isCorrect && <span className="ml-auto text-red-600 font-semibold">✗ 你的答案</span>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Non-MC: show answer comparison */}
                        {q.question_type !== 'mc' && (
                          <div className="flex flex-col gap-1 text-xs mb-2">
                            <div className="flex gap-2">
                              <span style={{ color: 'var(--text-muted)' }}>你的答案：</span>
                              <span style={{ color: q.is_correct === false ? '#dc2626' : 'var(--text)', fontWeight: 600 }}>
                                {q.child_answer || '（未作答）'}
                              </span>
                            </div>
                            {isObjective && (
                              <div className="flex gap-2">
                                <span style={{ color: 'var(--text-muted)' }}>正確答案：</span>
                                <span style={{ color: '#16a34a', fontWeight: 600 }}>{q.correct_answer}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="text-xs p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)' }}>
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
            style={{ background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--text)' }}
          >
            返回儀錶板
          </button>
          <button
            onClick={() => router.push('/exam/create')}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}
          >
            🏆 再次考試
          </button>
        </div>
      </div>
    </AppLayout>
  )
}

export default function ExamResultPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      </AppLayout>
    }>
      <ResultContent />
    </Suspense>
  )
}
