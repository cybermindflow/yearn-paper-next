'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import StepIndicator from '@/components/StepIndicator'
import { Lock } from 'lucide-react'

const GRADES = [
  { id: 'P1', label: '小一', available: false },
  { id: 'P2', label: '小二', available: false },
  { id: 'P3', label: '小三', available: true },
  { id: 'P4', label: '小四', available: false },
  { id: 'P5', label: '小五', available: false },
  { id: 'P6', label: '小六', available: false },
]

const SUBJECTS: Record<string, { id: string; label: string; available: boolean }[]> = {
  P3: [
    { id: 'gs', label: '常識科', available: true },
    { id: 'ch', label: '中文科', available: false },
    { id: 'en', label: '英文科', available: false },
    { id: 'ma', label: '數學科', available: false },
  ],
}

const STEPS = [
  { label: '年級科目', sublabel: '選擇' },
  { label: '知識單元', sublabel: '勾選' },
  { label: '題型設定', sublabel: '確認' },
]

function Step1Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  // Read mode from URL param (set by dashboard mode card), default to 'practice'
  const modeParam = searchParams.get('mode')
  const learningMode = (['practice', 'diagnosis', 'exam'].includes(modeParam || '')) ? modeParam! : 'practice'

  // Store mode in sessionStorage on mount so step3 can read it
  useEffect(() => {
    const existing = JSON.parse(sessionStorage.getItem('yp_step1') || '{}')
    sessionStorage.setItem('yp_step1', JSON.stringify({ ...existing, mode: learningMode }))
  }, [learningMode])

  const subjects = selectedGrade ? (SUBJECTS[selectedGrade] || []) : []
  const canNext = selectedGrade && selectedSubject

  const handleNext = () => {
    if (!canNext) return
    sessionStorage.setItem('yp_step1', JSON.stringify({ grade: selectedGrade, subject: selectedSubject, mode: learningMode }))
    router.push('/create/step2')
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto fade-in">
        <StepIndicator steps={STEPS} current={1} />

        <div className="card">
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--brand-dark)' }}>選擇年級</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            目前僅開放小三課程，其他年級即將推出
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {GRADES.map(g => (
              <button key={g.id}
                onClick={() => { if (g.available) { setSelectedGrade(g.id); setSelectedSubject(null) } }}
                disabled={!g.available}
                className="relative flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all text-sm font-semibold"
                style={
                  !g.available
                    ? { borderColor: 'var(--border)', color: '#ccc', background: '#fafafa', cursor: 'not-allowed' }
                    : selectedGrade === g.id
                    ? { borderColor: 'var(--brand)', background: 'var(--brand)', color: '#fff' }
                    : { borderColor: 'var(--border)', color: 'var(--text)', background: '#fff' }
                }>
                {!g.available && (
                  <Lock size={10} className="absolute top-1.5 right-1.5" style={{ color: '#ccc' }} />
                )}
                {g.label}
              </button>
            ))}
          </div>

          {selectedGrade && (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--brand-dark)' }}>選擇科目</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                目前僅開放常識科，其他科目即將推出
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {subjects.map(s => (
                  <button key={s.id}
                    onClick={() => { if (s.available) setSelectedSubject(s.id) }}
                    disabled={!s.available}
                    className="relative flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all text-sm font-semibold"
                    style={
                      !s.available
                        ? { borderColor: 'var(--border)', color: '#ccc', background: '#fafafa', cursor: 'not-allowed' }
                        : selectedSubject === s.id
                        ? { borderColor: 'var(--brand)', background: 'var(--brand)', color: '#fff' }
                        : { borderColor: 'var(--border)', color: 'var(--text)', background: '#fff' }
                    }>
                    {!s.available && (
                      <Lock size={10} className="absolute top-1.5 right-1.5" style={{ color: '#ccc' }} />
                    )}
                    {s.label}
                    {!s.available && (
                      <span className="text-xs mt-0.5" style={{ color: '#ccc' }}>即將推出</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end mt-6">
            <button onClick={handleNext} disabled={!canNext} className="btn-primary px-8">
              下一步 →
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function Step1Page() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
        </div>
      </AppLayout>
    }>
      <Step1Content />
    </Suspense>
  )
}
