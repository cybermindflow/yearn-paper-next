'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Users, Loader2 } from 'lucide-react'

interface Child {
  id: string
  name: string
  grade: string
}

export default function RoleSelectPage() {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/children')
      .then(r => r.json())
      .then(d => setChildren(d.children || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>殷</div>
        <div>
          <div className="text-xl font-bold" style={{ color: '#1e3a5f' }}>殷學社教育中心</div>
          <div className="text-sm" style={{ color: '#64748b' }}>Yearn-paper 智能練習系統</div>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: '#1e3a5f' }}>
        請選擇使用模式
      </h1>
      <p className="text-sm mb-10 text-center" style={{ color: '#64748b' }}>
        家長負責出卷管理，學生負責作答練習
      </p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Parent Mode */}
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full p-6 rounded-2xl text-left transition-all active:scale-[0.97] shadow-md hover:shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            border: 'none',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Users size={28} />
            </div>
            <div>
              <div className="text-lg font-bold mb-1">家長模式</div>
              <div className="text-sm opacity-80">出卷、管理孩子、查看成績分析</div>
            </div>
          </div>
        </button>

        {/* Student Mode */}
        {children.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-center font-semibold" style={{ color: '#64748b' }}>
              學生模式 — 選擇孩子
            </p>
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => router.push(`/student?childId=${child.id}`)}
                className="w-full p-5 rounded-2xl text-left transition-all active:scale-[0.97] shadow-md hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl font-bold"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-base font-bold">{child.name}</div>
                    <div className="text-sm opacity-80 flex items-center gap-1">
                      <BookOpen size={12} />
                      {child.grade} · 學生模式
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => router.push('/student')}
            className="w-full p-6 rounded-2xl text-left transition-all active:scale-[0.97] shadow-md hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <BookOpen size={28} />
              </div>
              <div>
                <div className="text-lg font-bold mb-1">學生模式</div>
                <div className="text-sm opacity-80">查看待完成任務並作答</div>
              </div>
            </div>
          </button>
        )}
      </div>

      <p className="mt-10 text-xs text-center" style={{ color: '#94a3b8' }}>
        殷學社教育中心 © 2026 · 版權所有
      </p>
    </div>
  )
}
