import type { Metadata, Viewport } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '殷學社教育中心 | AI 智能出卷平台',
  description: '殷學社教育中心 AI 出卷系統，根據課程知識點自動生成練習卷，支援線上作答、PDF 下載及成績追蹤。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '殷學社教育中心',
  },
}

export const viewport: Viewport = {
  themeColor: '#2d6a4f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK">
      <body className={notoSansTC.className}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
