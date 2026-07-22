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

// Math knowledge points that have validated image templates in mockLLM.ts
// Keep in sync with MATH_IMAGE_TEMPLATES keywords in src/lib/mockLLM.ts
const MATH_IMAGE_KEYWORDS: string[] = [
  '時間', '時鐘',
  '加法', '數線',
  '平面圖形', '三角形', '直角',
  '正方形', '周界',
  '長方形', '長方體',
  '圓形', '圓', '半徑',
  '角', '角度',
  '方向', '位置',
  '乘法',
]

function hasMathImageTemplate(knowledgePoint: string): boolean {
  return MATH_IMAGE_KEYWORDS.some(kw => knowledgePoint.includes(kw))
}

// 科目對應的標題和範疇顏色
const SUBJECT_CONFIG: Record<string, { title: string; color: string; pale: string }> = {
  gs:  { title: '常識科', color: '#16a34a', pale: '#f0fdf4' },
  ma:  { title: '數學科', color: '#2563eb', pale: '#eff6ff' },
  ch:  { title: '中文科', color: '#dc2626', pale: '#fff1f2' },
  hum: { title: '人文科（常識科知識庫）', color: '#0284c7', pale: '#f0f9ff' },
  sci: { title: '科學科', color: '#7c3aed', pale: '#faf5ff' },
  en:  { title: '英文科', color: '#ea580c', pale: '#fff7ed' },
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
    const gradeId = step1.grade || 'P3'
    setSubject(subjectId)

    fetch(`/api/knowledge?subject=${subjectId}&grade=${gradeId}`)
      .then(r => r.json())
      .then(d => {
        const chunks = d.knowledge || []
        setKnowledge(chunks)
        setSelected(new Set(chunks.map((k: KnowledgeChunk) => k.id)))
        // Expand all categories by default
        const cats = new Set<string>(chunks.map((k: KnowledgeChunk) => k.topic))
        setExpandedCategories(cats)
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
        if (next.size > 1) next.delete(level)
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

  const config = SUBJECT_CONFIG[subject] || { title: '知識點', color: 'var(--brand)', pale: 'var(--brand-pale)' }

  // ── 數學科: group by topic → knowledge_point, filter by level ──────────────
  if (subject === 'ma') {
    const filtered = knowledge.filter(k => selectedLevels.has(k.level ?? 1))
    const categoryMap: Record<string, Record<string, KnowledgeChunk[]>> = {}
    for (const k of filtered) {
      const cat = k.topic || '其他'
      const sub = k.knowledge_point || k.unit
      if (!categoryMap[cat]) categoryMap[cat] = {}
      if (!categoryMap[cat][sub]) categoryMap[cat][sub] = []
      categoryMap[cat][sub].push(k)
    }
    const categoryOrder = ['數（Number）', '度量（Measures）', '圖形與空間（Shape and Space）', '圖形與空間（Shape & Space）']
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
                <h2 className="text-xl font-bold" style={{ color: config.color }}>選擇知識點（{config.title}）</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>已選 {selected.size} / {knowledge.length} 個知識點</p>
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
            {orderedCategories.map(cat => {
              const subgroups = categoryMap[cat]
              const allItems = Object.values(subgroups).flat()
              const isExpanded = expandedCategories.has(cat)
              const selectedInCat = allItems.filter(k => selected.has(k.id)).length
              return (
                <div key={cat} className="mb-3">
                  <button onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: config.pale, border: `1.5px solid ${config.color}` }}>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={16} style={{ color: config.color }} /> : <ChevronRight size={16} style={{ color: config.color }} />}
                      <span className="font-bold text-sm" style={{ color: config.color }}>範疇：{cat}</span>
                      <span className="text-xs" style={{ color: config.color }}>（已選 {selectedInCat}/{allItems.length}）</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={e => { e.stopPropagation(); selectCategoryAll(allItems) }}
                        className="text-xs px-2 py-0.5 rounded-md" style={{ background: config.color, color: '#fff' }}>全選</button>
                      <button onClick={e => { e.stopPropagation(); clearCategoryAll(allItems) }}
                        className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#fff', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>清除</button>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-2 ml-2">
                      {Object.entries(subgroups).map(([sub, items]) => (
                        <div key={sub} className="mb-3">
                          <div className="text-xs font-semibold mb-1.5 px-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>
                          <div className="flex flex-col gap-1.5">
                            {items.map(k => {
                              const isSelected = selected.has(k.id)
                              const lvInfo = LEVEL_LABELS[k.level ?? 1]
                              return (
                                <button key={k.id} onClick={() => toggle(k.id)}
                                  className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                                  style={{ background: isSelected ? config.pale : 'var(--surface)', border: `1.5px solid ${isSelected ? config.color : 'var(--border)'}` }}>
                                  <div className="mt-0.5 flex-shrink-0" style={{ color: isSelected ? config.color : 'var(--border)' }}>
                                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{k.knowledge_point}</span>
                                      {hasMathImageTemplate(k.knowledge_point) && (
                                        <span
                                          title="此知識點支援看圖題"
                                          className="text-xs flex-shrink-0"
                                          style={{ fontSize: '14px', lineHeight: 1 }}
                                        >
                                          🖼️
                                        </span>
                                      )}
                                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                                        style={{ background: lvInfo.bg, color: lvInfo.color }}>{lvInfo.label}</span>
                                    </div>
                                    <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{k.learning_objective}</div>
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
              <button onClick={handleNext} disabled={selected.size === 0} className="btn-primary px-8">下一步 →</button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── 中文科 / 科學科 / 常識科 / 人文科：group by topic → unit ─────────────────
  // topic = 大範疇（聽/說/讀/寫 or 科學探究/物理科學 etc.）
  // unit = 子範疇（語音辨識/聽力理解 etc.）
  const topicMap: Record<string, Record<string, KnowledgeChunk[]>> = {}
  for (const k of knowledge) {
    const topic = k.topic || '其他'
    const unit = k.unit || topic
    if (!topicMap[topic]) topicMap[topic] = {}
    if (!topicMap[topic][unit]) topicMap[topic][unit] = []
    topicMap[topic][unit].push(k)
  }

  // 定義範疇排序
  const topicOrderMap: Record<string, string[]> = {
    ch:  ['聽', '說', '讀', '寫'],
    sci: ['科學探究', '物理科學', '生物科學', '地球科學'],
    gs:  ['健康與生活', '環境與生活', '人與環境', '科學與科技', '社會與公民', '中國與香港', '世界與我', '理財與經濟', '國家與我'],
    hum: ['健康與生活', '環境與生活', '理財與經濟', '社會與公民', '國家與我', '世界與我'],
    en:  ['Vocabulary', 'Grammar', 'Reading', 'Writing'],
  }
  const topicOrder = topicOrderMap[subject] || []
  const orderedTopics = [
    ...topicOrder.filter(t => topicMap[t]),
    ...Object.keys(topicMap).filter(t => !topicOrder.includes(t)),
  ]

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto fade-in">
        <StepIndicator steps={STEPS} current={2} />
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: config.color }}>選擇知識點（{config.title}）</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>已選 {selected.size} / {knowledge.length} 個知識點</p>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="btn-ghost text-xs">全選</button>
              <button onClick={clearAll} className="btn-ghost text-xs">清除</button>
            </div>
          </div>

          {/* 人文科映射提示 */}
          {subject === 'hum' && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
              💡 人文科使用常識科知識庫（六大範疇），完全兼容 2026/27 學年新課程框架。生成的練習卷將標記為「人文科」。
            </div>
          )}

          {orderedTopics.map(topic => {
            const unitGroups = topicMap[topic]
            const allItems = Object.values(unitGroups).flat()
            const isExpanded = expandedCategories.has(topic)
            const selectedInTopic = allItems.filter(k => selected.has(k.id)).length
            const hasSubunits = Object.keys(unitGroups).some(u => u !== topic)

            return (
              <div key={topic} className="mb-3">
                {/* Topic header */}
                <button onClick={() => toggleCategory(topic)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                  style={{ background: config.pale, border: `1.5px solid ${config.color}` }}>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={16} style={{ color: config.color }} /> : <ChevronRight size={16} style={{ color: config.color }} />}
                    <span className="font-bold text-sm" style={{ color: config.color }}>
                      {subject === 'ch' ? `${topic}（${['聽','說'].includes(topic) ? '聆聽/說話' : topic === '讀' ? '閱讀' : '寫作'}）` : `範疇：${topic}`}
                    </span>
                    <span className="text-xs" style={{ color: config.color }}>（已選 {selectedInTopic}/{allItems.length}）</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={e => { e.stopPropagation(); selectCategoryAll(allItems) }}
                      className="text-xs px-2 py-0.5 rounded-md" style={{ background: config.color, color: '#fff' }}>全選</button>
                    <button onClick={e => { e.stopPropagation(); clearCategoryAll(allItems) }}
                      className="text-xs px-2 py-0.5 rounded-md" style={{ background: '#fff', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>清除</button>
                  </div>
                </button>

                {/* Unit groups */}
                {isExpanded && (
                  <div className="mt-2 ml-2">
                    {Object.entries(unitGroups).map(([unit, items]) => (
                      <div key={unit} className="mb-3">
                        {hasSubunits && unit !== topic && (
                          <div className="text-xs font-semibold mb-1.5 px-1" style={{ color: 'var(--text-muted)' }}>
                            ▸ {unit}
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          {items.map(k => {
                            const isSelected = selected.has(k.id)
                            return (
                              <button key={k.id} onClick={() => toggle(k.id)}
                                className="flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                                style={{ background: isSelected ? config.pale : 'var(--surface)', border: `1.5px solid ${isSelected ? config.color : 'var(--border)'}` }}>
                                <div className="mt-0.5 flex-shrink-0" style={{ color: isSelected ? config.color : 'var(--border)' }}>
                                  {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{k.knowledge_point}</div>
                                  <div className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{k.learning_objective}</div>
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
            <button onClick={handleNext} disabled={selected.size === 0} className="btn-primary px-8">下一步 →</button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
