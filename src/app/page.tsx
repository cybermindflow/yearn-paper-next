import Link from 'next/link'
import { BookOpen, FileText, CheckCircle, BarChart2 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface)' }}>
      <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        className="sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--brand)' }}>殷</div>
            <span className="font-bold text-base" style={{ color: 'var(--brand-dark)' }}>殷學社教育中心</span>
          </div>
          <Link href="/auth" className="btn-primary text-sm px-4 py-2 rounded-lg no-underline">
            家長登入
          </Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: 'var(--brand-pale)', color: 'var(--brand)' }}>
          ✦ AI 智能練習卷生成平台
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight" style={{ color: 'var(--brand-dark)' }}>
          為孩子打造<span style={{ color: 'var(--brand)' }}>個人化</span><br />學習體驗
        </h1>
        <p className="text-base max-w-xl mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          殷學社教育中心 AI 出卷系統，根據課程知識點自動生成練習卷，<br />
          支援線上作答、PDF 下載及成績追蹤。
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/auth" className="btn-primary text-base px-8 py-3 rounded-xl no-underline">
            立即開始出卷 →
          </Link>
          <Link href="/auth" className="btn-secondary text-base px-8 py-3 rounded-xl no-underline">
            家長登入
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          {['免費試用', '無需安裝', '即時生成', 'PWA 支援'].map(t => (
            <span key={t} className="flex items-center gap-1">
              <CheckCircle size={14} style={{ color: 'var(--brand)' }} /> {t}
            </span>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8" style={{ color: 'var(--brand-dark)' }}>平台特色</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, title: 'AI 智能出卷', desc: '根據知識點自動生成多元題型，省時省力' },
            { icon: FileText, title: 'PDF 即時下載', desc: '題目卷含品牌浮水印，答案卷清晰排版' },
            { icon: CheckCircle, title: '線上作答批改', desc: '客觀題即時批改，主觀題顯示參考答案' },
            { icon: BarChart2, title: '成績分析記錄', desc: '追蹤每次練習表現，掌握學習進度' },
          ].map(f => (
            <div key={f.title} className="card text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--brand-pale)' }}>
                <f.icon size={20} style={{ color: 'var(--brand)' }} />
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--brand-dark)' }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="disclaimer">
        免責聲明：本練習卷由殷學社教育中心 AI 系統自動生成，僅供學習參考之用。題目內容已力求準確，惟如有任何錯誤或遺漏，本中心恕不負責。如有疑問，請向老師查詢。
        <br />© 2026 殷學社教育中心 Yearn Hopes Education Centre. All rights reserved.
      </footer>
    </div>
  )
}
