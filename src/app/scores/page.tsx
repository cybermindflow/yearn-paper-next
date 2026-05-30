'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { BarChart2, Loader2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Score {
  id: string
  paper_id: string
  total_questions: number
  correct_count: number
  score_percentage: number
  time_spent_seconds: number
  completed_at: string
  papers: { subject: string; unit: string; topic: string }
}

export default function ScoresPage() {
  const router = useRouter()
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/scores')
      .then(r => r.json())
      .then(d => setScores(d.scores || []))
      .finally(() => setLoading(false))
  }, [])

  const avg = scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score_percentage, 0) / scores.length)
    : null

  const formatTime = (s: number) => {
    if (!s) return '--'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto fade-in">
        <button onClick={() => router.back()} className="btn-ghost mb-4 text-sm">
          <ArrowLeft size={16} /> 返回
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--brand-pale)' }}>
            <BarChart2 size={20} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--brand-dark)' }}>成績記錄</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              共 {scores.length} 次練習
              {avg !== null && `，平均分數 ${avg}%`}
            </p>
          </div>
        </div>

        {scores.length === 0 ? (
          <div className="card text-center py-12">
            <BarChart2 size={40} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>尚無成績記錄</p>
            <button onClick={() => router.push('/create/step1')} className="btn-primary mt-4 text-sm">
              立即出卷
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {scores.map(s => {
              const pct = Math.round(s.score_percentage)
              const gradeColor = pct >= 80 ? 'var(--brand)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
              const gradeLabel = pct >= 80 ? '優秀' : pct >= 60 ? '良好' : '繼續努力'
              return (
                <div key={s.id} className="card flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>
                      {s.papers?.subject} · {s.papers?.unit}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {s.correct_count}/{s.total_questions} 題正確 ·
                      用時 {formatTime(s.time_spent_seconds)} ·
                      {new Date(s.completed_at).toLocaleDateString('zh-HK')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: gradeColor }}>{pct}%</div>
                    <span className="text-xs font-semibold" style={{ color: gradeColor }}>{gradeLabel}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
