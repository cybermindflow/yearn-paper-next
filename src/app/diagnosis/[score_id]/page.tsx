'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { Stethoscope, ChevronRight, Loader2, BarChart2, ArrowLeft, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface KnowledgePointResult {
  knowledgePointId: string
  total: number
  correct: number
  accuracy: number
  mastery: 'mastered' | 'unstable' | 'weak'
  masteryLabel: string
  masteryEmoji: string
}

interface DiagnosisReport {
  score: {
    id: string
    totalQuestions: number
    correctCount: number
    scorePercentage: number
    completedAt: string
  }
  paper: {
    id: string
    subject: string
    unit: string
    generatedAt: string
    deliveryMode: string
  }
  summary: {
    masteredCount: number
    unstableCount: number
    weakCount: number
    totalPoints: number
    masteredPercentage: number
  }
  knowledgePointResults: KnowledgePointResult[]
  weakPointIds: string[]
}

// Map knowledge point IDs to human-readable names
const KP_NAMES: Record<string, { name: string; topic: string }> = {
  // Math
  'M3_01': { name: '整數的認識與讀寫（至萬位）', topic: '數（Number）' },
  'M3_02': { name: '整數的比較與排列', topic: '數（Number）' },
  'M3_03': { name: '整數的加減法（至萬位）', topic: '數（Number）' },
  'M3_04': { name: '乘法（乘數至兩位）', topic: '數（Number）' },
  'M3_05': { name: '除法（除數至兩位）', topic: '數（Number）' },
  'M3_06': { name: '分數的認識（分子與分母）', topic: '數（Number）' },
  'M3_07': { name: '分數的比較（同分母）', topic: '數（Number）' },
  'M3_08': { name: '貨幣的認識與換算', topic: '數（Number）' },
  'M3_09': { name: '長度的量度（毫米、厘米、米）', topic: '度量（Measures）' },
  'M3_10': { name: '重量的量度（克、千克）', topic: '度量（Measures）' },
  'M3_11': { name: '容量的量度（毫升、升）', topic: '度量（Measures）' },
  'M3_12': { name: '時間的認識（時、分、秒）', topic: '度量（Measures）' },
  'M3_13': { name: '時間的計算（時間差）', topic: '度量（Measures）' },
  'M3_15': { name: '平面圖形的認識', topic: '圖形與空間（Shape and Space）' },
  'M3_16': { name: '立體圖形的認識', topic: '圖形與空間（Shape and Space）' },
  // Common Sense
  'P3-CS-U1-K01': { name: '社區購物場所的種類與特點', topic: '生活多姿彩' },
  'P3-CS-U1-K02': { name: '精明購物的考慮因素', topic: '生活多姿彩' },
  'P3-CS-U1-K03': { name: '消費者的基本權利', topic: '生活多姿彩' },
  'P3-CS-U1-K04': { name: '消費者的義務與責任', topic: '生活多姿彩' },
  'P3-CS-U1-K05': { name: '香港主要公共交通工具', topic: '生活多姿彩' },
  'P3-CS-U1-K06': { name: '公共交通的便利與優點', topic: '生活多姿彩' },
  'P3-CS-U1-K07': { name: '乘搭交通工具的禮儀與規則', topic: '生活多姿彩' },
  'P3-CS-U1-K08': { name: '社區設施的種類與用途', topic: '生活多姿彩' },
  'P3-CS-U1-K09': { name: '愛護社區環境的方法', topic: '生活多姿彩' },
  'P3-CS-U1-K10': { name: '社區服務人員的工作與貢獻', topic: '生活多姿彩' },
}

const MASTERY_COLORS = {
  mastered: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  unstable: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  weak: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
}

export default function DiagnosisReportPage() {
  const { score_id } = useParams<{ score_id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<DiagnosisReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch(`/api/diagnosis/${score_id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          toast.error(data.error)
          router.replace('/dashboard')
        } else {
          setReport(data)
        }
      })
      .catch(() => {
        toast.error('無法載入診斷報告')
        router.replace('/dashboard')
      })
      .finally(() => setLoading(false))
  }, [score_id, router])

  const handleGeneratePractice = async () => {
    if (!report || report.weakPointIds.length === 0) {
      toast.info('恭喜！所有知識點均已掌握，無需針對練習。')
      return
    }
    setGenerating(true)
    try {
      // Store diagnosis source in sessionStorage for Step 3 to read
      const subjectId = report.paper.subject === '數學科' ? 'ma' : 'gs'
      sessionStorage.setItem('yp_step1', JSON.stringify({ grade: 'P3', subject: subjectId, mode: 'practice' }))
      sessionStorage.setItem('yp_step2', JSON.stringify({ knowledgeIds: report.weakPointIds }))
      sessionStorage.setItem('yp_diagnosis_source', JSON.stringify({
        scoreId: score_id,
        knowledgeIds: report.weakPointIds,
        weakTopics: report.weakPointIds,
      }))
      router.push('/create/step3')
    } finally {
      setGenerating(false)
    }
  }

  const handleRetryDiagnosis = () => {
    const subject = report?.paper.subject === '數學科' ? 'ma' : 'cs'
    router.push(`/diagnosis/create?subject=${subject}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  if (!report) return null

  const { summary, knowledgePointResults, paper } = report

  // Group results by topic
  const grouped: Record<string, KnowledgePointResult[]> = {}
  for (const r of knowledgePointResults) {
    const topic = KP_NAMES[r.knowledgePointId]?.topic || '其他'
    if (!grouped[topic]) grouped[topic] = []
    grouped[topic].push(r)
  }

  return (
    <AppLayout>
      <div className="fade-in max-w-2xl mx-auto">
        {/* Back button */}
        <button onClick={() => router.push('/dashboard')}
          className="btn-ghost text-sm flex items-center gap-1 mb-4">
          <ArrowLeft size={15} /> 返回儀錶板
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand)' }}>
            <Stethoscope size={20} color="#fff" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--brand-dark)' }}>診斷報告</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {paper.subject} · {new Date(paper.generatedAt).toLocaleDateString('zh-HK')}
            </p>
          </div>
        </div>

        {/* Overall score */}
        <div className="card mb-4 text-center">
          <div className="text-4xl font-bold mb-1"
            style={{ color: report.score.scorePercentage >= 80 ? 'var(--brand)' : report.score.scorePercentage >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
            {Math.round(report.score.scorePercentage)}%
          </div>
          <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {report.score.correctCount} / {report.score.totalQuestions} 題正確
          </div>

          {/* Mastery summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: '已掌握', count: summary.masteredCount, emoji: '🟢', bg: '#dcfce7', text: '#166534' },
              { label: '不太穩', count: summary.unstableCount, emoji: '🟡', bg: '#fef9c3', text: '#854d0e' },
              { label: '未掌握', count: summary.weakCount, emoji: '🔴', bg: '#fee2e2', text: '#991b1b' },
            ].map(s => (
              <div key={s.label} className="rounded-xl py-3 px-2"
                style={{ background: s.bg }}>
                <div className="text-2xl font-bold" style={{ color: s.text }}>{s.count}</div>
                <div className="text-xs font-medium" style={{ color: s.text }}>{s.emoji} {s.label}</div>
              </div>
            ))}
          </div>

          {/* Mastery progress bar */}
          <div className="text-xs mb-1.5 text-left" style={{ color: 'var(--text-muted)' }}>
            掌握度 {summary.masteredPercentage}%
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${summary.masteredPercentage}%`,
                background: 'var(--brand)',
              }} />
          </div>
        </div>

        {/* Detailed analysis by topic */}
        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} style={{ color: 'var(--brand)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--brand-dark)' }}>詳細分析</h2>
          </div>

          {Object.entries(grouped).map(([topic, results]) => (
            <div key={topic} className="mb-4">
              <div className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2"
                style={{ background: 'var(--brand-pale)', color: 'var(--brand)' }}>
                {topic}
              </div>
              <div className="flex flex-col gap-2">
                {results.map(r => {
                  const kp = KP_NAMES[r.knowledgePointId]
                  const colors = MASTERY_COLORS[r.mastery]
                  return (
                    <div key={r.knowledgePointId}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: colors.text }}>
                          {kp?.name || r.knowledgePointId}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: colors.text, opacity: 0.8 }}>
                          {r.correct}/{r.total} 題正確 · {r.accuracy}%
                        </div>
                      </div>
                      <div className="ml-3 text-sm font-bold flex items-center gap-1"
                        style={{ color: colors.text }}>
                        {r.masteryEmoji} {r.masteryLabel}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {report.weakPointIds.length > 0 ? (
            <button
              onClick={handleGeneratePractice}
              disabled={generating}
              className="btn-primary flex items-center justify-center gap-2 py-3">
              {generating
                ? <Loader2 size={18} className="animate-spin" />
                : <Zap size={18} />}
              一鍵生成針對練習（{report.weakPointIds.length} 個弱項知識點）
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="text-center py-3 rounded-xl text-sm font-medium"
              style={{ background: '#dcfce7', color: '#166534' }}>
              🎉 恭喜！所有知識點均已掌握，繼續保持！
            </div>
          )}
          <button
            onClick={handleRetryDiagnosis}
            className="btn-ghost flex items-center justify-center gap-2 py-2.5 text-sm">
            <Stethoscope size={16} /> 再次診斷
          </button>
        </div>

        {/* Disclaimer */}
        <p className="disclaimer mt-6 text-center">
          ⚠️ 本診斷報告由 AI 生成，僅供參考。如對結果有疑問，請向老師查詢。
        </p>
      </div>
    </AppLayout>
  )
}
