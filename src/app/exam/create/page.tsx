'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { Trophy, Clock, FileText, BookOpen, ChevronRight, Loader2, AlertCircle, Download, FileDown } from 'lucide-react'
import { toast } from 'sonner'

const SUBJECTS = [
  { id: '常識科', label: '常識科', emoji: '🌍' },
  { id: '數學科', label: '數學科', emoji: '🔢' },
]

const GRADES = [
  { id: 'P3', label: '小三' },
]

const TIME_OPTIONS = [
  { value: 30, label: '30 分鐘', desc: '快速測驗' },
  { value: 45, label: '45 分鐘', desc: '標準考試' },
  { value: 60, label: '60 分鐘', desc: '完整考試' },
]

const QUESTION_OPTIONS = [
  { value: 20, label: '20 題', desc: '精簡版' },
  { value: 30, label: '30 題', desc: '標準版' },
  { value: 40, label: '40 題', desc: '完整版' },
]

export default function ExamCreatePage() {
  const router = useRouter()
  const [subject, setSubject] = useState('常識科')
  const [grade] = useState('P3')
  const [timeLimit, setTimeLimit] = useState(45)
  const [questionCount, setQuestionCount] = useState(30)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState<'question' | 'answer' | null>(null)

  // Computed distribution preview
  const mcCount = Math.round(questionCount * 0.6)
  const tfCount = Math.round(questionCount * 0.2)
  const fillCount = Math.round(questionCount * 0.1)
  const shortCount = questionCount - mcCount - tfCount - fillCount

  // Generate exam paper and return paperId
  const generateExam = async (): Promise<string | null> => {
    const res = await fetch('/api/exam/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        grade,
        knowledgePointIds: 'all',
        questionCount,
        timeLimitMinutes: timeLimit,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || '考試卷生成失敗')
      return null
    }
    return data.paperId as string
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      const paperId = await generateExam()
      if (paperId) router.push(`/exam/${paperId}`)
    } catch {
      toast.error('網絡錯誤，請重試')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async (type: 'question' | 'answer') => {
    setPdfLoading(type)
    try {
      toast.info('正在生成考試卷，請稍候...')
      const paperId = await generateExam()
      if (!paperId) return

      // Download PDF
      const res = await fetch(`/api/exam/${paperId}/pdf?type=${type}`)
      if (!res.ok) {
        toast.error('PDF 生成失敗')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = type === 'question'
        ? `殷學社_模擬考試題目卷_${subject}_${grade}.pdf`
        : `殷學社_模擬考試答案卷_${subject}_${grade}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(type === 'question' ? '題目卷已下載！' : '答案卷已下載！')
    } catch {
      toast.error('下載失敗，請重試')
    } finally {
      setPdfLoading(null)
    }
  }

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
            <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-dark)' }}>模擬考試</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              系統會生成一份限時模擬試卷，模擬真實考試情境
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl mb-6"
          style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
          <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
          <div className="text-sm" style={{ color: '#92400e' }}>
            <strong>考試規則：</strong>考試期間不可中斷，時間到將自動交卷。當前題目可更改選項，點擊「下一題」後鎖定，不可返回修改。
          </div>
        </div>

        {/* Subject selection */}
        <div className="card mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--brand-dark)' }}>
            <BookOpen size={16} style={{ color: 'var(--brand)' }} />
            選擇科目
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map(s => (
              <button
                key={s.id}
                onClick={() => setSubject(s.id)}
                className="p-4 rounded-xl border-2 text-left transition-all"
                style={subject === s.id
                  ? { borderColor: '#f59e0b', background: '#fffbeb' }
                  : { borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Grade */}
        <div className="card mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--brand-dark)' }}>
            <FileText size={16} style={{ color: 'var(--brand)' }} />
            選擇年級
          </h2>
          <div className="flex gap-3">
            {GRADES.map(g => (
              <div key={g.id}
                className="px-5 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                {g.label}（預設）
              </div>
            ))}
          </div>
        </div>

        {/* Time limit */}
        <div className="card mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--brand-dark)' }}>
            <Clock size={16} style={{ color: 'var(--brand)' }} />
            考試時間
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {TIME_OPTIONS.map(t => (
              <button
                key={t.value}
                onClick={() => setTimeLimit(t.value)}
                className="p-3 rounded-xl border-2 text-center transition-all"
                style={timeLimit === t.value
                  ? { borderColor: '#f59e0b', background: '#fffbeb' }
                  : { borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div className="font-bold text-sm" style={{ color: timeLimit === t.value ? '#d97706' : 'var(--text)' }}>{t.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div className="card mb-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--brand-dark)' }}>
            <FileText size={16} style={{ color: 'var(--brand)' }} />
            題目數量
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {QUESTION_OPTIONS.map(q => (
              <button
                key={q.value}
                onClick={() => setQuestionCount(q.value)}
                className="p-3 rounded-xl border-2 text-center transition-all"
                style={questionCount === q.value
                  ? { borderColor: '#f59e0b', background: '#fffbeb' }
                  : { borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <div className="font-bold text-sm" style={{ color: questionCount === q.value ? '#d97706' : 'var(--text)' }}>{q.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{q.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="card mb-6" style={{ background: '#f8fafc', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-3" style={{ color: 'var(--brand-dark)' }}>📋 考試預覽</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>選擇題</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{mcCount} 題（60%）</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>判斷題</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{tfCount} 題（20%）</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>填充題</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{fillCount} 題（10%）</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>問答題</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{shortCount} 題（10%）</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>難度 L1</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>30%</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>難度 L2</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>50%</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>難度 L3</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>20%</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>計時方式</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>倒數計時</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            ⚠️ 計時器將在開始作答後啟動 · 當前題目可更改，點擊「下一題」後鎖定
          </div>
        </div>

        {/* Action buttons */}
        {/* Primary: Start online exam */}
        <button
          onClick={handleStart}
          disabled={loading || pdfLoading !== null}
          className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-3"
          style={{
            background: (loading || pdfLoading !== null) ? 'var(--border)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff',
            cursor: (loading || pdfLoading !== null) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              正在生成考試卷...
            </>
          ) : (
            <>
              <Trophy size={20} />
              開始考試（線上作答）
              <ChevronRight size={20} />
            </>
          )}
        </button>

        {/* Secondary: PDF download section */}
        <div className="card" style={{ border: '1px dashed var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Download size={16} style={{ color: 'var(--text-muted)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--brand-dark)' }}>下載 PDF 版（打印作答）</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            系統將生成新的考試卷並下載 PDF，適合打印後手寫作答。⏱ 請家長協助計時 {timeLimit} 分鐘。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDownloadPdf('question')}
              disabled={loading || pdfLoading !== null}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
              style={{
                background: pdfLoading === 'question' ? 'var(--border)' : '#fffbeb',
                border: '1.5px solid #f59e0b',
                color: '#d97706',
                cursor: (loading || pdfLoading !== null) ? 'not-allowed' : 'pointer',
              }}
            >
              {pdfLoading === 'question' ? (
                <><Loader2 size={14} className="animate-spin" />生成中...</>
              ) : (
                <><FileDown size={14} />下載題目卷</>
              )}
            </button>
            <button
              onClick={() => handleDownloadPdf('answer')}
              disabled={loading || pdfLoading !== null}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
              style={{
                background: pdfLoading === 'answer' ? 'var(--border)' : '#f0fdf4',
                border: '1.5px solid #22c55e',
                color: '#16a34a',
                cursor: (loading || pdfLoading !== null) ? 'not-allowed' : 'pointer',
              }}
            >
              {pdfLoading === 'answer' ? (
                <><Loader2 size={14} className="animate-spin" />生成中...</>
              ) : (
                <><FileDown size={14} />下載答案卷</>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
