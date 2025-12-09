import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export const ensureAuthHeader = (value: string) => {
  const token = value.trim()
  if (!token) return ''
  return /^bearer\s+/i.test(token) ? token : `Bearer ${token}`
}

export const formatMs = (ms: number) => `${ms.toFixed(0)} ms`

export const formatSuccessRate = (runs: number, total: number) => {
  if (total === 0) return '0%'
  return `${((runs / total) * 100).toFixed(0)}%`
}
