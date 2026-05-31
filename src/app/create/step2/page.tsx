'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import StepIndicator from '@/components/StepIndicator'
import { CheckSquare, Square, Loader2, ChevronDown, ChevronRight } from 'lucide-react'

interface KnowledgeChunk {
  id: string
  topic: string
  unit: string
  knowledge_point: string
  learning_objective: string
  level?: number
  category?: string
  subcategory?: string
}

const STEPS = [
  { label: '年級科目', sublabel: '選擇' },
  { label: '知識單元', sublabel: '勾選' },
  { label: '題型設定', sublabel: '確認' },
]

const LEVEL_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'L1 基礎', color: '#16a34a', bg: '#dcfce7' },
  2: { label: 'L2 標準', color: '#d97706', bg: '#fef3c7' },
  3: { label: 'L3 挑戰', color: '#dc2626', bg: '#fee2e2' },
}

export default function Step2Page() {
  const router = useRouter()
  const [knowledge, setKnowledge] = useState<KnowledgeChunk[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState<string>('gs')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedLevels, setSelectedLevels] = useState<Set<number>>(new Set([1, 2, 3]))

  useEffect(() => {
    const step1 = JSON.parse(sessionStorage.getItem('yp_step1') || '{}')
    const subjectId = step1.subject || 'gs'
    setSubject(subjectId)

    fetch(`/api/knowledge?subject=${subjectId}`)
      .then(r => r.json())
      .then(d => {
        const chunks = d.knowledge || []
        setKnowledge(chunks)
        setSelected(new Set(chunks.map((k: KnowledgeChunk) => k.id)))
        // Expand all categories by default
        if (subjectId === 'ma') {
          const cats = new Set<string>(chunks.map((k: KnowledgeChunk) => k.category || k.topic))
          setExpandedCategories(cats)
        }
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

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const toggleLevel = (level: number) => {
    setSelectedLevels(prev => {
      const next = new Set(prev)
      if (next.has(level)) {
        if (next.size > 1) next.delete(level) // keep at least 1
      } else {
        next.add(level)
      }
      return next
    })
  }

  const selectCategoryAll = (items: KnowledgeChunk[]) => {
    setSelected(prev => {
      const next = new Set(prev)
      items.forEach(k => next.add(k.id))
      return next
    })
  }

  const clearCategoryAll = (items: KnowledgeChunk[]) => {
    setSelected(prev => {
      const next = new Set(prev)
      items.forEach(k => next.delete(k.id))
      return next
    })
  }

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

  const isMath = subject === 'ma'

  // ── Math: group by category → subcategory, filter by level ──────────────────
  if (isMath) {
    // Filter by selected levels
    const filtered = knowledge.filter(k => selectedLevels.has(k.level ?? 1))

    // Group: topic (category) → knowledge_point (subcategory) → items
    // topic field: "數（Number）", "度量（Measures）", "圖形與空間（Shape and Space）"
    const categoryMap: Record<string, Record<string, KnowledgeChunk[]>> = {}
    for (const k of filtered) {
      const cat = k.topic || '其他'
      const sub = k.knowledge_point || k.unit
      if (!categoryMap[cat]) categoryMap[cat] = {}
      if (!categoryMap[cat][sub]) categoryMap[cat][sub] = []
      categoryMap[cat][sub].push(k)
    }

    const categoryOrder = ['數（Number）', '度量（Measures）', '圖形與空間（Shape and Space）']
    const orderedCategories = [
      ...categoryOrder.filter(c => categoryMap[c]),
      ...Object.keys(categoryMap).filter(c => !categoryOrder.includes(c)),
    ]

    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto fade-in">
          <StepIndicator steps={STEPS} current={2} />

          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--brand-dark)' }}>選擇知識點（數學科）</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  已選 {selected.size} / {knowledge.length} 個知識點
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAll} className="btn-ghost text-xs">全選</button>
                <button onClick={clearAll} className="btn-ghost text-xs">清除</button>
              </div>
            </div>

            {/* Level filter */}
            <div className="mb-5 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>篩選難度層級</div>
              <div className="flex gap-2">
                {[1, 2, 3].map(lv => {
                  const info = LEVEL_LABELS[lv]
                  const active = selectedLevels.has(lv)
                  return (
                    <button key={lv} onClick={() => toggleLevel(lv)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                      style={active
                        ? { borderColor: info.color, background: info.bg, color: info.color }
                        : { borderColor: 'var(--border)', background: '#fff', color: 'var(--text-muted)' }}>
                      {info.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Category groups */}
            {orderedCategories.map(cat => {
              const subgroups = categoryMap[cat]
              const allItems = Object.values(subgroups).flat()
              const isExpanded = expandedCategories.has(cat)
              const selectedInCat = allItems.filter(k => selected.has(k.id)).length

              return (
                <div key={cat} className="mb-3">
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: 'var(--brand-pale)', border: '1.5px solid var(--brand)' }}>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--brand)' }} /> : <ChevronRight size={16} style={{ color: 'var(--brand)' }} />}
                      <span className="font-bold text-sm" style={{ color: 'var(--brand-dark)' }}>
                        範疇：{cat}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--brand)' }}>
                        （已選 {selectedInCat}/{allItems.length}）
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); selectCategoryAll(allItems) }}
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: 'var(--brand)', color: '#fff' }}>
                        全選
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); clearCategoryAll(allItems) }}
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{ background: '#fff', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        清除
                      </button>
                    </div>
                  </button>

                  {/* Subcategory items */}
                  {isExpanded && (
                    <div className="mt-2 ml-2">
                      {Object.entries(subgroups).map(([sub, items]) => (
                        <div key={sub} className="mb-3">
                          <div className="text-xs font-semibold mb-1.5 px-1" style={{ color: 'var(--text-muted)' }}>
                            {sub}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {items.map(k => {
                              const isSelected = selected.has(k.id)
                              const lvInfo = LEVEL_LABELS[k.level ?? 1]
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
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                                        {k.knowledge_point}
                                      </span>
                                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                                        style={{ background: lvInfo.bg, color: lvInfo.color }}>
                                        {lvInfo.label}
                                      </span>
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
                    </div>
                  )}
                </div>
              )
            })}

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

  // ── 常識科: original flat list grouped by topic ──────────────────────────────
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
