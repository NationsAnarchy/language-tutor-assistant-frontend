const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const toBackend: Record<string, string> = { english: 'en', korean: 'ko', japanese: 'ja' }
const fromBackend: Record<string, string> = { en: 'english', ko: 'korean', ja: 'japanese' }

function shouldUseProxy(): boolean {
  return typeof window !== 'undefined' && window.location.hostname !== 'localhost'
}

export function resolveApiUrl(path: string): string {
  return shouldUseProxy() ? `/api/proxy${path}` : `${BACKEND_URL}${path}`
}

export function languageToBackend(language: string): string {
  return toBackend[language] || language
}

export function languageFromBackend(language: string): string {
  return fromBackend[language] || language
}

export function backendAudioUrl(filename: string): string {
  return shouldUseProxy() ? `/api/proxy/audio/${filename}` : `${BACKEND_URL}/audio/${filename}`
}
