'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { Plus, BookOpen, FileText, BarChart2, Users, ChevronRight, Loader2, Stethoscope, PenLine, Trophy, ClipboardList, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Child { id: string; name: string; grade: string }
interface Paper {
  id: string; subject: string; topic: string; unit: string
  mode: string; status: string; generated_at: string
}
interface Score {
  id: string; paper_id: string; score_percentage: number
  total_questions: number; correct_count: number; completed_at: string
  mode?: string
  papers: { subject: string; unit: string; mode?: string; time_limit_minutes?: number }
}
interface ExamScore {
  id: string; paper_id: string; score_percentage: number
  total_questions: number; correct_count: number
  time_spent_seconds: number; completed_at: string
  papers: { id: string; subject: string; topic: string; time_limit_minutes: number }
}

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [diagnosisScores, setDiagnosisScores] = useState<Score[]>([])
  const [examScores, setExamScores] = useState<ExamScore[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddChild, setShowAddChild] = useState(false)
  const [childName, setChildName] = useState('')
  const [childGrade, setChildGrade] = useState('P3')

  useEffect(() => {
    Promise.all([
      fetch('/api/children').then(r => r.json()),
      fetch('/api/papers').then(r => r.json()),
      fetch('/api/scores').then(r => r.json()),
      fetch('/api/scores?mode=diagnosis').then(r => r.json()),
      fetch('/api/exam/history').then(r => r.json()),
    ]).then(([c, p, s, d, e]) => {
      setChildren(c.children || [])
      setPapers(p.papers || [])
      setScores(s.scores || [])
      setDiagnosisScores(d.scores || [])
      setExamScores(e.exams || [])
    }).finally(() => setLoading(false))
  }, [])

  const addChild = async () => {
    if (!childName.trim()) { toast.error('請填寫孩子姓名'); return }
    const res = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: childName, grade: childGrade }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    setChildren(prev => [...prev, data.child])
    setChildName(''); setShowAddChild(false)
    toast.success('孩子檔案已新增')
  }

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score_percentage, 0) / scores.length)
    : null

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
      <div className="fade-in">
        {/* Mode selection cards */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>選擇模式</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 診斷模式 - active */}
            <Link href="/diagnosis/create"
              className="card flex flex-col items-center text-center py-5 no-underline group transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ borderColor: '#8b5cf6', borderWidth: '2px' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: '#8b5cf6' }}>
                <Stethoscope size={24} color="#fff" />
              </div>
              <div className="font-bold text-sm mb-1" style={{ color: '#5b21b6' }}>診斷模式</div>
              <div className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#ede9fe', color: '#7c3aed' }}>立即使用</div>
            </Link>

            {/* 練習模式 - active */}
            <Link href="/create/step1?mode=practice"
              className="card flex flex-col items-center text-center py-5 no-underline group transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ borderColor: 'var(--brand)', borderWidth: '2px' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'var(--brand)' }}>
                <PenLine size={24} color="#fff" />
              </div>
              <div className="font-bold text-sm mb-1" style={{ color: 'var(--brand-dark)' }}>練習模式</div>
              <div className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--brand-pale)', color: 'var(--brand)' }}>立即使用</div>
            </Link>

            {/* 模擬考試 - now active */}
            <Link href="/exam/create"
              className="card flex flex-col items-center text-center py-5 no-underline group transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ borderColor: '#f59e0b', borderWidth: '2px' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <Trophy size={24} color="#fff" />
              </div>
              <div className="font-bold text-sm mb-1" style={{ color: '#92400e' }}>模擬考試</div>
              <div className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#fef3c7', color: '#d97706' }}>立即使用</div>
            </Link>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            建議先完成診斷，了解孩子弱項，再生成針對性練習。
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: '孩子檔案', value: children.length, unit: '位' },
            { icon: BookOpen, label: '出卷次數', value: papers.length, unit: '次' },
            { icon: FileText, label: '已完成', value: papers.filter(p => p.status === 'completed').length, unit: '份' },
            { icon: BarChart2, label: '平均分數', value: avgScore ?? '--', unit: avgScore ? '%' : '' },
          ].map(s => (
            <div key={s.label} className="card flex flex-col gap-1">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon size={14} style={{ color: 'var(--brand)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: 'var(--brand-dark)' }}>
                {s.value}<span className="text-sm font-normal ml-0.5">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Children + Quick action */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Children */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base" style={{ color: 'var(--brand-dark)' }}>孩子檔案</h2>
                <button onClick={() => setShowAddChild(v => !v)} className="btn-ghost text-xs">
                  <Plus size={14} /> 新增
                </button>
              </div>
              {showAddChild && (
                <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--brand-pale)' }}>
                  <input value={childName} onChange={e => setChildName(e.target.value)}
                    placeholder="孩子姓名" className="input-field mb-2 text-sm" />
                  <select value={childGrade} onChange={e => setChildGrade(e.target.value)}
                    className="input-field mb-2 text-sm">
                    {['P1','P2','P3','P4','P5','P6'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={addChild} className="btn-primary text-xs py-1.5 px-4">確認</button>
                    <button onClick={() => setShowAddChild(false)} className="btn-ghost text-xs">取消</button>
                  </div>
                </div>
              )}
              {children.length === 0 ? (
                <div className="text-center py-6">
                  <Users size={32} className="mx-auto mb-2" style={{ color: 'var(--border)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>尚未新增孩子檔案</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {children.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl"
                      style={{ background: 'var(--surface)' }}>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{c.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.grade}</div>
                      </div>
                      <span className="badge badge-green">{c.grade}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick action */}
            <Link href="/create/step1?mode=practice" className="card flex items-center justify-between no-underline group hover:shadow-md transition-shadow"
              style={{ borderColor: 'var(--brand)', borderWidth: '1.5px' }}>
              <div>
                <div className="font-bold text-sm mb-0.5" style={{ color: 'var(--brand-dark)' }}>開始出卷</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>三步驟生成練習卷</div>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--brand)' }}>
                <ChevronRight size={18} color="#fff" />
              </div>
            </Link>
          </div>

          {/* Right: Diagnosis History + Papers + Scores */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Diagnosis History */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList size={16} style={{ color: '#8b5cf6' }} />
                  <h2 className="font-bold text-base" style={{ color: '#5b21b6' }}>診斷歷史</h2>
                </div>
                <Link href="/diagnosis/create" className="btn-ghost text-xs no-underline"
                  style={{ color: '#7c3aed' }}>
                  + 新增診斷
                </Link>
              </div>
              {diagnosisScores.length === 0 ? (
                <div className="text-center py-6">
                  <Stethoscope size={28} className="mx-auto mb-2" style={{ color: '#c4b5fd' }} />
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>未有診斷記錄</p>
                  <Link href="/diagnosis/create" className="text-sm font-medium no-underline"
                    style={{ color: '#7c3aed' }}>立即診斷 →</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {diagnosisScores.slice(0, 3).map(s => {
                    const pct = Math.round(s.score_percentage)
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm" style={{ color: '#5b21b6' }}>
                            {s.papers?.subject || '診斷卷'}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: '#7c3aed' }}>
                            {s.completed_at ? new Date(s.completed_at).toLocaleDateString('zh-HK') : ''}
                            {' · '}{s.correct_count}/{s.total_questions} 題正確
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <div className="text-lg font-bold"
                            style={{ color: pct >= 80 ? 'var(--brand)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                            {pct}%
                          </div>
                          <Link href={`/diagnosis/${s.id}`}
                            className="text-xs px-2 py-1 rounded-lg font-medium no-underline"
                            style={{ background: '#ede9fe', color: '#7c3aed' }}>
                            查看報告
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Papers */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base" style={{ color: 'var(--brand-dark)' }}>最近出卷記錄</h2>
                <Link href="/create/step1?mode=practice" className="btn-ghost text-xs no-underline">
                  <Plus size={14} /> 新增
                </Link>
              </div>
              {papers.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen size={32} className="mx-auto mb-2" style={{ color: 'var(--border)' }} />
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>尚未出卷，立即開始！</p>
                  <Link href="/create/step1?mode=practice" className="btn-primary text-sm no-underline">立即出卷</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {papers.slice(0, 5).map(p => (
                    <Link key={p.id} href={`/paper/${p.id}`}
                      className="flex items-center justify-between p-3 rounded-xl no-underline transition-colors hover:bg-green-50"
                      style={{ background: 'var(--surface)' }}>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                          {p.subject} · {p.unit}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {new Date(p.generated_at).toLocaleDateString('zh-HK')} ·
                          {p.mode === 'practice' ? ' 練習模式' : p.mode === 'diagnosis' ? ' 診斷模式' : p.mode === 'exam' ? ' 模擬考試' : ' 練習模式'}
                        </div>
                      </div>
                      <span className={`badge ${
                        p.status === 'completed' ? 'badge-green' :
                        p.status === 'generated' ? 'badge-orange' : 'badge-gray'
                      }`}>
                        {p.status === 'completed' ? '已完成' :
                         p.status === 'generated' ? '已生成' : '待生成'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent scores */}
            {scores.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-base" style={{ color: 'var(--brand-dark)' }}>最近成績</h2>
                  <Link href="/scores" className="btn-ghost text-xs no-underline">查看全部</Link>
                </div>
                <div className="flex flex-col gap-2">
                  {scores.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'var(--surface)' }}>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                          {s.papers?.subject} · {s.papers?.unit}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {s.correct_count}/{s.total_questions} 題正確
                        </div>
                      </div>
                      <div className="text-xl font-bold" style={{
                        color: s.score_percentage >= 80 ? 'var(--brand)' :
                               s.score_percentage >= 60 ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {Math.round(s.score_percentage)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exam history */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy size={16} style={{ color: '#d97706' }} />
                  <h2 className="font-bold text-base" style={{ color: '#92400e' }}>模擬考試歷史</h2>
                </div>
                <Link href="/exam/create" className="btn-ghost text-xs no-underline"
                  style={{ color: '#d97706' }}>+ 新增考試</Link>
              </div>
              {examScores.length === 0 ? (
                <div className="text-center py-6">
                  <Trophy size={28} className="mx-auto mb-2" style={{ color: '#fcd34d' }} />
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>未有考試記錄</p>
                  <Link href="/exam/create" className="text-sm font-medium no-underline"
                    style={{ color: '#d97706' }}>立即考試 →</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {examScores.slice(0, 3).map(s => {
                    const pct = Math.round(s.score_percentage)
                    const mins = s.time_spent_seconds ? Math.round(s.time_spent_seconds / 60) : null
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm" style={{ color: '#92400e' }}>
                            {s.papers?.subject || '模擬考試'} · {s.papers?.topic || 'P3'}
                          </div>
                          <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#d97706' }}>
                            {s.completed_at ? new Date(s.completed_at).toLocaleDateString('zh-HK') : ''}
                            {mins && (
                              <><span>·</span><Clock size={10} /><span>{mins} 分鐘</span></>
                            )}
                            <span>·</span><span>{s.correct_count}/{s.total_questions} 題</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <div className="text-lg font-bold"
                            style={{ color: pct >= 75 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626' }}>
                            {pct}%
                          </div>
                          <Link href={`/exam/${s.paper_id}/result`}
                            className="text-xs px-2 py-1 rounded-lg font-medium no-underline"
                            style={{ background: '#fef3c7', color: '#d97706' }}>
                            查看報告
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
