'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import StepIndicator from '@/components/StepIndicator'
import { toast } from 'sonner'
import { Loader2, CheckSquare, Square } from 'lucide-react'

const QUESTION_TYPES = [
  { id: 'mc', label: '選擇題', desc: '4 個選項，選一個正確答案' },
  { id: 'tf', label: '判斷題', desc: '判斷陳述是否正確' },
  { id: 'fill', label: '填充題', desc: '填入正確詞語' },
  { id: 'match', label: '配對題', desc: '將項目與描述配對' },
  { id: 'classify', label: '分類題', desc: '將項目分類' },
  { id: 'short', label: '問答題（短）', desc: '2-3 句短答' },
  { id: 'essay', label: '問答題（長）', desc: '段落式作答' },
]

const STEPS = [
  { label: '年級科目', sublabel: '選擇' },
  { label: '知識單元', sublabel: '勾選' },
  { label: '題型設定', sublabel: '確認' },
]

export default function Step3Page() {
  const router = useRouter()
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mc', 'tf'])
  const [difficulty, setDifficulty] = useState(1)
  const [pageCount, setPageCount] = useState(2)
  const [deliveryMode, setDeliveryMode] = useState<'online' | 'pdf'>('online')
  const [loading, setLoading] = useState(false)

  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const totalQuestions = pageCount * 3

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) { toast.error('請至少選擇一種題型'); return }

    const step2 = JSON.parse(sessionStorage.getItem('yp_step2') || '{}')

    setLoading(true)
    try {
      // 1. Create paper
      // Read mode and subject from sessionStorage (set by step1)
      const step1 = JSON.parse(sessionStorage.getItem('yp_step1') || '{}')
      const learningMode = step1.mode || 'practice'
      const subjectId = step1.subject || 'gs'

      // Map subject ID to display name and topic
      const subjectMap: Record<string, { name: string; topic: string; unit: string }> = {
        gs: { name: '常識科', topic: '生活多姿彩', unit: '單元一' },
        ma: { name: '數學科', topic: '小三數學', unit: '網路知識圖譜' },
        ch: { name: '中文科', topic: '小三中文', unit: '單元一' },
        en: { name: '英文科', topic: 'Primary 3 English', unit: 'Unit 1' },
      }
      const subjectInfo = subjectMap[subjectId] || subjectMap.gs

      const paperRes = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjectInfo.name,
          topic: subjectInfo.topic,
          unit: subjectInfo.unit,
          questionTypes: selectedTypes,
          difficultyLevel: difficulty,
          pageCount,
          mode: learningMode,
          deliveryMode,
        }),
      })
      const paperData = await paperRes.json()
      if (!paperRes.ok) { toast.error(paperData.error); return }

      const paperId = paperData.paper.id

      // 2. Generate questions
      const genRes = await fetch(`/api/papers/${paperId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeIds: step2.knowledgeIds }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) { toast.error(genData.error); return }

      toast.success(`成功生成 ${genData.count} 道題目！`)
      sessionStorage.removeItem('yp_step1')
      sessionStorage.removeItem('yp_step2')
      router.push(`/paper/${paperId}`)
    } catch {
      toast.error('生成失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto fade-in">
        <StepIndicator steps={STEPS} current={3} />

        <div className="card">
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--brand-dark)' }}>設定題型與參數</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            預計生成 {totalQuestions} 道題目（每頁 3 題）
          </p>

          {/* Question types */}
          <div className="mb-6">
            <label className="label mb-3">題型選擇（可多選）</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUESTION_TYPES.map(t => {
                const isSelected = selectedTypes.includes(t.id)
                return (
                  <button key={t.id} onClick={() => toggleType(t.id)}
                    className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? 'var(--brand-pale)' : 'var(--surface)',
                      border: `1.5px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`,
                    }}>
                    <div className="mt-0.5 flex-shrink-0" style={{ color: isSelected ? 'var(--brand)' : 'var(--border)' }}>
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{t.label}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div className="mb-6">
            <label className="label">難度設定</label>
            <div className="flex gap-2 mt-1">
              {[
                { val: 1, label: '基礎', color: 'var(--brand)' },
                { val: 2, label: '中等', color: 'var(--warning)' },
                { val: 3, label: '挑戰', color: 'var(--danger)' },
              ].map(d => (
                <button key={d.val} onClick={() => setDifficulty(d.val)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={difficulty === d.val
                    ? { borderColor: d.color, background: d.color, color: '#fff' }
                    : { borderColor: 'var(--border)', color: 'var(--text-muted)', background: '#fff' }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page count */}
          <div className="mb-6">
            <label className="label">頁數（每頁 3 題）</label>
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setPageCount(v => Math.max(1, v - 1))}
                className="w-9 h-9 rounded-xl border-2 font-bold text-lg flex items-center justify-center transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--brand)' }}>−</button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold" style={{ color: 'var(--brand-dark)' }}>{pageCount}</span>
                <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>頁 / {totalQuestions} 題</span>
              </div>
              <button onClick={() => setPageCount(v => Math.min(6, v + 1))}
                className="w-9 h-9 rounded-xl border-2 font-bold text-lg flex items-center justify-center transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--brand)' }}>+</button>
            </div>
          </div>

          {/* Mode */}
          <div className="mb-6">
            <label className="label">作答模式</label>
            <div className="flex gap-2 mt-1">
              {[
                { val: 'online', label: '線上作答', desc: '即時批改，自動記錄成績' },
                { val: 'pdf', label: 'PDF 下載', desc: '列印後手寫作答，手動輸入成績' },
              ].map(m => (
                <button key={m.val} onClick={() => setDeliveryMode(m.val as 'online' | 'pdf')}
                  className="flex-1 p-3 rounded-xl border-2 text-left transition-all"
                  style={deliveryMode === m.val
                    ? { borderColor: 'var(--brand)', background: 'var(--brand-pale)' }
                    : { borderColor: 'var(--border)', background: '#fff' }}>
                  <div className="font-semibold text-sm" style={{ color: deliveryMode === m.val ? 'var(--brand)' : 'var(--text)' }}>
                    {m.label}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => router.back()} className="btn-secondary px-6">← 上一步</button>
            <button onClick={handleGenerate} disabled={loading || selectedTypes.length === 0}
              className="btn-primary px-8">
              {loading ? <><Loader2 size={16} className="animate-spin" /> 生成中...</> : '生成練習卷 ✦'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
