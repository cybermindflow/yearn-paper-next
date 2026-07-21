import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yearn-paper 學生版',
  description: '殷學社教育中心 學生練習平台',
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
