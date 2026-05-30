'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { toast } from 'sonner'
import { Download, PlayCircle, FileText, Loader2, ArrowLeft, PenLine } from 'lucide-react'

interface Paper {
  id: string; subject: string; topic: string; unit: string
  mode: string; status: string; difficulty_level: number
  page_count: number; question_types: string[]; generated_at: string
}
interface Question {
  id: string; question_number: number; question_text: string
  question_type: string; options: Record<string, string> | null
  correct_answer: string
}

const TYPE_LABELS: Record<string, string> = {
  mc: '選擇題', tf: '判斷題', fill: '填充題',
  match: '配對題', classify: '分類題', short: '問答題', essay: '問答題',
}

export default function PaperDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<'question' | 'answer' | null>(null)

  // Manual score entry
  const [showManual, setShowManual] = useState(false)
  const [manualTotal, setManualTotal] = useState('')
  const [manualCorrect, setManualCorrect] = useState('')
  const [submittingManual, setSubmittingManual] = useState(false)

  useEffect(() => {
    fetch(`/api/papers/${id}`)
      .then(r => r.json())
      .then(d => {
        setPaper(d.paper)
        setQuestions(d.questions || [])
      })
      .finally(() => setLoading(false))
  }, [id])

  const downloadPdf = async (type: 'question' | 'answer') => {
    setDownloading(type)
    try {
      const res = await fetch(`/api/papers/${id}/pdf?type=${type}`)
      if (!res.ok) { toast.error('PDF 生成失敗'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = type === 'question' ? `殷學社_題目卷.pdf` : `殷學社_答案卷.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF 下載成功')
    } catch {
      toast.error('下載失敗')
    } finally {
      setDownloading(null)
    }
  }

  const submitManualScore = async () => {
    const total = parseInt(manualTotal)
    const correct = parseInt(manualCorrect)
    if (!total || !correct || correct > total) { toast.error('請填寫正確的題數'); return }
    setSubmittingManual(true)
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId: id, totalQuestions: total, correctCount: correct }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); setSubmittingManual(false); return }
    toast.success('成績已記錄！')
    setShowManual(false)
    setSubmittingManual(false)
    router.push('/scores')
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

  if (!paper) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p style={{ color: 'var(--text-muted)' }}>找不到此練習卷</p>
          <button onClick={() => router.back()} className="btn-secondary mt-4">返回</button>
        </div>
      </AppLayout>
    )
  }

  const difficultyLabel = ['', '基礎', '中等', '挑戰'][paper.difficulty_level] || '基礎'
  const typeLabels = paper.question_types.map(t => TYPE_LABELS[t] || t).join('、')

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto fade-in">
        <button onClick={() => router.back()} className="btn-ghost mb-4 text-sm">
          <ArrowLeft size={16} /> 返回
        </button>

        {/* Paper info */}
        <div className="card mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--brand-dark)' }}>
                {paper.subject} · {paper.unit}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{paper.topic}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="badge badge-green">{difficultyLabel}</span>
                <span className="badge badge-orange">{paper.page_count} 頁 / {questions.length} 題</span>
                <span className="badge badge-gray">{typeLabels}</span>
                <span className="badge badge-gray">{paper.mode === 'online' ? '線上作答' : 'PDF 模式'}</span>
              </div>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {new Date(paper.generated_at).toLocaleDateString('zh-HK')}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {paper.mode === 'online' && paper.status !== 'completed' && (
            <button onClick={() => router.push(`/practice/${id}`)}
              className="btn-primary flex items-center justify-center gap-2 py-3">
              <PlayCircle size={18} /> 開始線上作答
            </button>
          )}
          <button onClick={() => downloadPdf('question')} disabled={downloading === 'question'}
            className="btn-secondary flex items-center justify-center gap-2 py-3">
            {downloading === 'question' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            下載題目卷
          </button>
          <button onClick={() => downloadPdf('answer')} disabled={downloading === 'answer'}
            className="btn-secondary flex items-center justify-center gap-2 py-3">
            {downloading === 'answer' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            下載答案卷
          </button>
          {paper.mode === 'pdf' && paper.status !== 'completed' && (
            <button onClick={() => setShowManual(v => !v)}
              className="btn-ghost flex items-center justify-center gap-2 py-3 border"
              style={{ borderColor: 'var(--border)' }}>
              <PenLine size={16} /> 手動輸入成績
            </button>
          )}
        </div>

        {/* Manual score entry */}
        {showManual && (
          <div className="card mb-6" style={{ borderColor: 'var(--brand)', borderWidth: '1.5px' }}>
            <h3 className="font-bold mb-3" style={{ color: 'var(--brand-dark)' }}>手動輸入成績</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">總題數</label>
                <input type="number" value={manualTotal} onChange={e => setManualTotal(e.target.value)}
                  placeholder={String(questions.length)} className="input-field" min="1" />
              </div>
              <div>
                <label className="label">正確題數</label>
                <input type="number" value={manualCorrect} onChange={e => setManualCorrect(e.target.value)}
                  placeholder="0" className="input-field" min="0" />
              </div>
            </div>
            <button onClick={submitManualScore} disabled={submittingManual} className="btn-primary w-full">
              {submittingManual ? <Loader2 size={16} className="animate-spin" /> : null}
              確認記錄成績
            </button>
          </div>
        )}

        {/* Questions preview */}
        <div className="card">
          <h2 className="font-bold mb-4" style={{ color: 'var(--brand-dark)' }}>
            題目預覽（{questions.length} 題）
          </h2>
          <div className="flex flex-col gap-3">
            {questions.map(q => (
              <div key={q.id} className="p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
                <div className="flex items-start gap-2">
                  <span className="badge badge-green text-xs flex-shrink-0 mt-0.5">
                    {TYPE_LABELS[q.question_type] || q.question_type}
                  </span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {q.question_number}. {q.question_text}
                    </p>
                    {q.options && (
                      <div className="mt-1.5 grid grid-cols-2 gap-1">
                        {Object.entries(q.options).filter(([k]) => k.length === 1).map(([k, v]) => (
                          <span key={k} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {k}. {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
