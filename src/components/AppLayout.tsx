'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { BookOpen, LayoutDashboard, BarChart2, LogOut, Menu, X } from 'lucide-react'

interface Parent {
  id: string
  phone: string
  nickname: string | null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [parent, setParent] = useState<Parent | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.parent) setParent(data.parent)
        else router.replace('/auth')
      })
      .catch(() => router.replace('/auth'))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/auth')
  }

  const navItems = [
    { href: '/dashboard', label: '儀錶板', icon: LayoutDashboard },
    { href: '/create/step1?mode=practice', label: '出卷', icon: BookOpen },
    { href: '/scores', label: '成績', icon: BarChart2 },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface)' }}>
      {/* ── Top Nav ── */}
      <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        className="sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--brand)' }}>
              殷
            </div>
            <span className="font-bold text-base hidden sm:block" style={{ color: 'var(--brand-dark)' }}>
              殷學社教育中心
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                    active
                      ? 'text-white'
                      : 'hover:bg-green-50'
                  }`}
                  style={active ? { background: 'var(--brand)', color: '#fff' } : { color: 'var(--text-muted)' }}>
                  <item.icon size={15} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {parent && (
              <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                {parent.nickname || parent.phone}
              </span>
            )}
            <button onClick={handleLogout} className="btn-ghost text-xs flex items-center gap-1">
              <LogOut size={14} />
              <span className="hidden sm:inline">登出</span>
            </button>
            {/* Mobile menu toggle */}
            <button className="md:hidden btn-ghost p-1.5" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t px-4 py-2 flex flex-col gap-1"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium no-underline"
                style={{ color: pathname.startsWith(item.href) ? 'var(--brand)' : 'var(--text-muted)' }}>
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* ── Footer disclaimer ── */}
      <footer className="disclaimer">
        免責聲明：本練習卷由殷學社教育中心 AI 系統自動生成，僅供學習參考之用。題目內容已力求準確，惟如有任何錯誤或遺漏，本中心恕不負責。如有疑問，請向老師查詢。
        <br />
        © 2026 殷學社教育中心 Yearn Hopes Education Centre. All rights reserved.
      </footer>
    </div>
  )
}
