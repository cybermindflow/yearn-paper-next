'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Clock, CheckCircle2, ChevronRight, LogOut, Loader2, AlertCircle, Star } from 'lucide-react'

interface Child {
  id: string
  name: string
  grade: string
}

interface Task {
  id: string
  subject: string
  topic: string
  unit: string
  mode: 'practice' | 'diagnosis' | 'exam'
  difficulty_level: number
  page_count: number
  status: 'pending' | 'generated'
  generated_at: string
  delivery_mode: string
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  '數學科': { bg: '#dbeafe', text: '#1d4ed8', icon: '🔢' },
  '中文科': { bg: '#fce7f3', text: '#be185d', icon: '📖' },
  '英文科': { bg: '#d1fae5', text: '#065f46', icon: '🔤' },
  '常識科': { bg: '#fef3c7', text: '#92400e', icon: '🌍' },
  '人文科': { bg: '#ede9fe', text: '#5b21b6', icon: '🏛️' },
  '科學科': { bg: '#cffafe', text: '#0e7490', icon: '🔬' },
}

const MODE_LABELS: Record<string, { label: string; color: string }> = {
  practice: { label: '練習模式', color: '#3b82f6' },
  diagnosis: { label: '診斷模式', color: '#f59e0b' },
  exam: { label: '考試模式', color: '#ef4444' },
}

const DIFFICULTY_STARS = (level: number) =>
  Array.from({ length: 3 }, (_, i) => (
    <Star
      key={i}
      size={12}
      fill={i < level ? '#f59e0b' : 'none'}
      stroke={i < level ? '#f59e0b' : '#d1d5db'}
    />
  ))

function StudentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId')

  const [child, setChild] = useState<Child | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!childId) {
      router.replace('/role-select')
      return
    }

    fetch(`/api/student/tasks?childId=${childId}`)
      .then(async r => {
        if (r.status === 401) {
          router.replace('/auth')
          return null
        }
        if (!r.ok) {
          const d = await r.json()
          throw new Error(d.error || '讀取任務失敗')
        }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setChild(d.child)
        setTasks(d.tasks || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [childId, router])

  const handleStart = (task: Task) => {
    const path = task.mode === 'exam' ? `/exam/${task.id}` : `/practice/${task.id}`
    router.push(path)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf4' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin" style={{ color: '#10b981' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>載入任務中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f0fdf4' }}>
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
          <p className="text-base font-semibold mb-2" style={{ color: '#1e3a5f' }}>{error}</p>
          <button
            onClick={() => router.push('/role-select')}
            className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#10b981' }}
          >
            返回選擇頁
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf4' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            {child?.name?.charAt(0) || '學'}
          </div>
          <div>
            <div className="text-base font-bold leading-tight">{child?.name || '學生'} 的任務</div>
            <div className="text-xs opacity-80">{child?.grade || 'P3'} · 學生模式</div>
          </div>
        </div>
        <button
          onClick={() => router.push('/role-select')}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <LogOut size={14} />
          切換
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Summary */}
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-4"
          style={{ background: '#fff', boxShadow: '0 2px 12px rgba(16,185,129,0.1)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: '#d1fae5' }}>
            <BookOpen size={24} style={{ color: '#059669' }} />
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: '#059669' }}>{tasks.length}</div>
            <div className="text-sm" style={{ color: '#64748b' }}>
              {tasks.length === 0 ? '暫無待完成任務' : '份待完成任務'}
            </div>
          </div>
        </div>

        {/* Task List */}
        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 size={56} className="mx-auto mb-4" style={{ color: '#10b981' }} />
            <p className="text-lg font-bold mb-2" style={{ color: '#1e3a5f' }}>太棒了！</p>
            <p className="text-sm" style={{ color: '#64748b' }}>所有任務已完成，等待家長出新題目</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold mb-1" style={{ color: '#64748b' }}>
              待完成任務
            </h2>
            {tasks.map((task, idx) => {
              const subjectStyle = SUBJECT_COLORS[task.subject] || { bg: '#f1f5f9', text: '#475569', icon: '📝' }
              const modeStyle = MODE_LABELS[task.mode] || { label: task.mode, color: '#64748b' }
              const date = new Date(task.generated_at)
              const dateStr = `${date.getMonth() + 1}/${date.getDate()}`

              return (
                <button
                  key={task.id}
                  onClick={() => handleStart(task)}
                  className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.97]"
                  style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}
                >
                  <div className="flex items-start gap-3">
                    {/* Subject Icon */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: subjectStyle.bg }}>
                      {subjectStyle.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold" style={{ color: subjectStyle.text }}>
                          {task.subject}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${modeStyle.color}18`, color: modeStyle.color }}>
                          {modeStyle.label}
                        </span>
                      </div>
                      <div className="text-sm font-semibold mb-1 truncate" style={{ color: '#1e3a5f' }}>
                        {task.topic}
                      </div>
                      <div className="text-xs mb-2 truncate" style={{ color: '#94a3b8' }}>
                        {task.unit}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5">
                          {DIFFICULTY_STARS(task.difficulty_level)}
                        </div>
                        <div className="flex items-center gap-1 text-xs" style={{ color: '#94a3b8' }}>
                          <Clock size={11} />
                          {dateStr} 出題
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                  </div>

                  {/* Start Button */}
                  <div className="mt-3 py-2 rounded-xl text-center text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
                    開始作答
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs" style={{ color: '#94a3b8' }}>
        殷學社教育中心 · 學生端
      </footer>
    </div>
  )
}

export default function StudentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fdf4' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#10b981' }} />
      </div>
    }>
      <StudentContent />
    </Suspense>
  )
}
