'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import StepIndicator from '@/components/StepIndicator'
import { CheckSquare, Square, Loader2 } from 'lucide-react'

interface KnowledgeChunk {
  id: string
  topic: string
  unit: string
  knowledge_point: string
  learning_objective: string
}

const STEPS = [
  { label: '年級科目', sublabel: '選擇' },
  { label: '知識單元', sublabel: '勾選' },
  { label: '題型設定', sublabel: '確認' },
]

export default function Step2Page() {
  const router = useRouter()
  const [knowledge, setKnowledge] = useState<KnowledgeChunk[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/knowledge')
      .then(r => r.json())
      .then(d => {
        setKnowledge(d.knowledge || [])
        setSelected(new Set((d.knowledge || []).map((k: KnowledgeChunk) => k.id)))
      })
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(knowledge.map(k => k.id)))
  const clearAll = () => setSelected(new Set())

  const handleNext = () => {
    if (selected.size === 0) return
    sessionStorage.setItem('yp_step2', JSON.stringify({ knowledgeIds: Array.from(selected) }))
    router.push('/create/step3')
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

  // Group by topic
  const grouped = knowledge.reduce<Record<string, KnowledgeChunk[]>>((acc, k) => {
    const key = `${k.topic} · ${k.unit}`
    if (!acc[key]) acc[key] = []
    acc[key].push(k)
    return acc
  }, {})

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto fade-in">
        <StepIndicator steps={STEPS} current={2} />

        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--brand-dark)' }}>選擇知識點</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                已選 {selected.size} / {knowledge.length} 個知識點
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="btn-ghost text-xs">全選</button>
              <button onClick={clearAll} className="btn-ghost text-xs">清除</button>
            </div>
          </div>

          {Object.entries(grouped).map(([groupLabel, items]) => (
            <div key={groupLabel} className="mb-4">
              <div className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--brand)' }}>
                {groupLabel}
              </div>
              <div className="flex flex-col gap-1.5">
                {items.map(k => {
                  const isSelected = selected.has(k.id)
                  return (
                    <button key={k.id} onClick={() => toggle(k.id)}
                      className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: isSelected ? 'var(--brand-pale)' : 'var(--surface)',
                        border: `1.5px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`,
                      }}>
                      <div className="mt-0.5 flex-shrink-0" style={{ color: isSelected ? 'var(--brand)' : 'var(--border)' }}>
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                          {k.knowledge_point}
                        </div>
                        <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {k.learning_objective}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="flex justify-between mt-6">
            <button onClick={() => router.back()} className="btn-secondary px-6">← 上一步</button>
            <button onClick={handleNext} disabled={selected.size === 0} className="btn-primary px-8">
              下一步 →
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
