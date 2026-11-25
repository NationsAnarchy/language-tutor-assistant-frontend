const toBackend: Record<string, string> = { english: 'en', korean: 'ko', japanese: 'ja' }
const fromBackend: Record<string, string> = { en: 'english', ko: 'korean', ja: 'japanese' }

export function resolveApiUrl(path: string): string {
  return `/api/proxy${path.startsWith('/') ? path : `/${path}`}`
}

export function languageToBackend(language: string): string {
  return toBackend[language] || language
}

export function languageFromBackend(language: string): string {
  return fromBackend[language] || language
}

export function backendAudioUrl(filename: string): string {
  return resolveApiUrl(`/audio/${filename}`)
}
