'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { Stethoscope, ChevronRight, Loader2, CheckSquare, Square, CheckCheck, X } from 'lucide-react'
import { toast } from 'sonner'

// ── Static knowledge point definitions ──────────────────────────────────────
const CS_KNOWLEDGE_POINTS = [
  { id: 'P3-CS-U1-K01', topic: '生活多姿彩', name: '社區購物場所的種類與特點' },
  { id: 'P3-CS-U1-K02', topic: '生活多姿彩', name: '精明購物的考慮因素' },
  { id: 'P3-CS-U1-K03', topic: '生活多姿彩', name: '消費者的基本權利' },
  { id: 'P3-CS-U1-K04', topic: '生活多姿彩', name: '消費者的義務與責任' },
  { id: 'P3-CS-U1-K05', topic: '生活多姿彩', name: '香港主要公共交通工具' },
  { id: 'P3-CS-U1-K06', topic: '生活多姿彩', name: '公共交通的便利與優點' },
  { id: 'P3-CS-U1-K07', topic: '生活多姿彩', name: '乘搭交通工具的禮儀與規則' },
  { id: 'P3-CS-U1-K08', topic: '生活多姿彩', name: '社區設施的種類與用途' },
  { id: 'P3-CS-U1-K09', topic: '生活多姿彩', name: '愛護社區環境的方法' },
  { id: 'P3-CS-U1-K10', topic: '生活多姿彩', name: '社區服務人員的工作與貢獻' },
]

const MATH_KNOWLEDGE_POINTS = [
  // 數（Number）
  { id: 'M3_01', topic: '數（Number）', name: '整數的認識與讀寫（至萬位）' },
  { id: 'M3_02', topic: '數（Number）', name: '整數的比較與排列' },
  { id: 'M3_03', topic: '數（Number）', name: '整數的加減法（至萬位）' },
  { id: 'M3_04', topic: '數（Number）', name: '乘法（乘數至兩位）' },
  { id: 'M3_05', topic: '數（Number）', name: '除法（除數至兩位）' },
  { id: 'M3_06', topic: '數（Number）', name: '分數的認識（分子與分母）' },
  { id: 'M3_07', topic: '數（Number）', name: '分數的比較（同分母）' },
  { id: 'M3_08', topic: '數（Number）', name: '貨幣的認識與換算' },
  // 度量（Measures）
  { id: 'M3_09', topic: '度量（Measures）', name: '長度的量度（毫米、厘米、米）' },
  { id: 'M3_10', topic: '度量（Measures）', name: '重量的量度（克、千克）' },
  { id: 'M3_11', topic: '度量（Measures）', name: '容量的量度（毫升、升）' },
  { id: 'M3_12', topic: '度量（Measures）', name: '時間的認識（時、分、秒）' },
  { id: 'M3_13', topic: '度量（Measures）', name: '時間的計算（時間差）' },
  // 圖形與空間（Shape and Space）
  { id: 'M3_15', topic: '圖形與空間（Shape and Space）', name: '平面圖形的認識（三角形、四邊形、圓形）' },
  { id: 'M3_16', topic: '圖形與空間（Shape and Space）', name: '立體圖形的認識（正方體、長方體、圓柱體）' },
]

const STORAGE_KEY_PREFIX = 'yp_diagnosis_selection_'

interface KnowledgePoint {
  id: string
  topic: string
  name: string
}

export default function DiagnosisCreatePage() {
  const router = useRouter()
  const [subject, setSubject] = useState<'cs' | 'ma'>('ma')
  const [grade] = useState('P3')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  const knowledgePoints: KnowledgePoint[] = subject === 'ma' ? MATH_KNOWLEDGE_POINTS : CS_KNOWLEDGE_POINTS
  const storageKey = `${STORAGE_KEY_PREFIX}${grade}_${subject}`

  // Restore last selection from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const ids: string[] = JSON.parse(saved)
        setSelectedIds(new Set(ids))
      } else {
        // Default: select all
        setSelectedIds(new Set(knowledgePoints.map(k => k.id)))
      }
    } catch {
      setSelectedIds(new Set(knowledgePoints.map(k => k.id)))
    }
  }, [subject, storageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save selection to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(selectedIds)))
    } catch { /* ignore */ }
  }, [selectedIds, storageKey])

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(knowledgePoints.map(k => k.id)))
  const clearAll = () => setSelectedIds(new Set())

  // Group by topic
  const grouped: Record<string, KnowledgePoint[]> = {}
  for (const kp of knowledgePoints) {
    if (!grouped[kp.topic]) grouped[kp.topic] = []
    grouped[kp.topic].push(kp)
  }

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error('請至少勾選一個知識點')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/diagnosis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject === 'ma' ? '數學科' : '常識科',
          grade,
          knowledgePointIds: Array.from(selectedIds),
          deliveryMode: 'online',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '生成診斷卷失敗')
        return
      }
      // Navigate to practice page (same as regular practice)
      router.push(`/practice/${data.paperId}?mode=diagnosis`)
    } catch {
      toast.error('網絡錯誤，請稍後再試')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <AppLayout>
      <div className="fade-in max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--brand)' }}>
            <Stethoscope size={20} color="#fff" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--brand-dark)' }}>診斷模式</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              選擇已學知識點，系統為每個知識點生成 3 道題目（選擇題 + 判斷題）
            </p>
          </div>
        </div>

        {/* Subject selector */}
        <div className="card mb-4">
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--brand-dark)' }}>選擇科目</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'ma', label: '數學科', emoji: '🔢' },
              { value: 'cs', label: '常識科', emoji: '🌍' },
            ].map(s => (
              <button
                key={s.value}
                onClick={() => setSubject(s.value as 'cs' | 'ma')}
                className="flex flex-col items-center py-3 px-4 rounded-xl border-2 transition-all font-medium text-sm"
                style={{
                  borderColor: subject === s.value ? 'var(--brand)' : 'var(--border)',
                  background: subject === s.value ? 'var(--brand-pale)' : 'var(--card)',
                  color: subject === s.value ? 'var(--brand-dark)' : 'var(--text-muted)',
                }}>
                <span className="text-2xl mb-1">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs px-1" style={{ color: 'var(--text-muted)' }}>
            年級：小三（P3）
          </div>
        </div>

        {/* Knowledge points */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--brand-dark)' }}>
              勾選已學知識點
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                已選 {selectedIds.size} / {knowledgePoints.length} 個
              </span>
            </h2>
            <div className="flex gap-2">
              <button onClick={selectAll} className="btn-ghost text-xs flex items-center gap-1">
                <CheckCheck size={13} /> 全選
              </button>
              <button onClick={clearAll} className="btn-ghost text-xs flex items-center gap-1">
                <X size={13} /> 清除
              </button>
            </div>
          </div>

          {Object.entries(grouped).map(([topic, points]) => (
            <div key={topic} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--brand-pale)', color: 'var(--brand)' }}>
                  {topic}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {points.filter(p => selectedIds.has(p.id)).length}/{points.length}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {points.map(kp => {
                  const checked = selectedIds.has(kp.id)
                  return (
                    <button
                      key={kp.id}
                      onClick={() => toggleId(kp.id)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm"
                      style={{
                        background: checked ? 'var(--brand-pale)' : 'var(--surface)',
                        border: `1px solid ${checked ? 'var(--brand)' : 'var(--border)'}`,
                        color: checked ? 'var(--brand-dark)' : 'var(--text-muted)',
                      }}>
                      {checked
                        ? <CheckSquare size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                        : <Square size={16} style={{ color: 'var(--border)', flexShrink: 0 }} />}
                      <span>{kp.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Estimate */}
        {selectedIds.size > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--brand-pale)', color: 'var(--brand-dark)' }}>
            預計生成 <strong>{selectedIds.size * 3} 道題目</strong>（每個知識點 3 題，選擇題 + 判斷題）
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || selectedIds.size === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
          {generating
            ? <><Loader2 size={18} className="animate-spin" /> 正在生成診斷卷…</>
            : <><Stethoscope size={18} /> 開始診斷 <ChevronRight size={16} /></>}
        </button>
      </div>
    </AppLayout>
  )
}
