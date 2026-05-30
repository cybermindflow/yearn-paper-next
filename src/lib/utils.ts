import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatPercent(val: number): string {
  return `${Math.round(val)}%`
}
