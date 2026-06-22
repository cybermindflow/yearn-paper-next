'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Eye, EyeOff, Phone, Lock, User } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const fillDemo = () => { setPhone('51111111'); setPassword('yearn2026') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { phone, password }
        : { phone, password, nickname }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || '操作失敗')
        return
      }

      toast.success(mode === 'login' ? '登入成功！' : '註冊成功！')
      router.push('/dashboard')
    } catch {
      toast.error('網絡錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface)' }}>
      <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        className="h-14 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'var(--brand)' }}>殷</div>
          <span className="font-bold text-base" style={{ color: 'var(--brand-dark)' }}>殷學社教育中心</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm fade-in">
          <div className="card">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--brand-dark)' }}>
                {mode === 'login' ? '家長登入' : '建立帳號'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {mode === 'login' ? '登入以管理孩子的練習卷' : '建立家長帳號，開始出卷'}
              </p>
            </div>

            {/* Tab */}
            <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--brand-pale)' }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={mode === m
                    ? { background: 'var(--brand)', color: '#fff' }
                    : { background: 'transparent', color: 'var(--text-muted)' }}>
                  {m === 'login' ? '登入' : '註冊'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'register' && (
                <div>
                  <label className="label">暱稱（選填）</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                      placeholder="例如：陳媽媽" className="input-field pl-9" />
                  </div>
                </div>
              )}

              <div>
                <label className="label">手機號碼</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="例如：51234567" className="input-field pl-9" required />
                </div>
              </div>

              <div>
                <label className="label">密碼</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="請輸入密碼" className="input-field pl-9 pr-10" required />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? <span className="spinner" /> : null}
                {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
              </button>
            </form>

            {mode === 'login' && (
              <button onClick={fillDemo}
                className="w-full mt-3 py-2 text-xs rounded-lg border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'transparent' }}>
                使用示範帳號（51111111 / yearn2026）
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="disclaimer">
        © 2026 殷學社教育中心 Yearn Hopes Education Centre. All rights reserved.
      </footer>
    </div>
  )
}
