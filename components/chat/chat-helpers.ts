import type { MutableRefObject } from 'react'
import { synthesizeAudio } from '@/lib/api'
import type { Language } from '@/lib/types'

export const STARTER_PROMPTS: Record<Language, string[]> = {
  korean: ['안녕하세요 — introduce yourself', '날씨에 대해 이야기해요', '식당을 추천해주세요'],
  japanese: ['自己紹介をしてください', '趣味について話しましょう', 'おすすめの場所を教えて'],
  english: ['Introduce yourself', 'Describe your daily routine', 'Talk about a hobby'],
}

export function demoFallback(language: Language): string {
  if (language === 'korean') return '백엔드에 연결되지 않았어요. uvicorn app.main:app --reload 로 백엔드를 시작해 주세요.'
  if (language === 'japanese') return 'バックエンドに接続できませんでした。uvicorn app.main:app --reload でバックエンドを起動してください。'
  return 'Backend not connected. Start it with: uvicorn app.main:app --reload'
}


export function synthesizeExercisePrompt({
  sessionId, text, audioAbortRef, setExerciseAudioUrl,
}: {
  sessionId: string
  text: string
  audioAbortRef: MutableRefObject<AbortController | null>
  setExerciseAudioUrl: (url: string) => void
}): void {
  const audioController = new AbortController()
  audioAbortRef.current = audioController
  void synthesizeAudio(sessionId, text, audioController.signal)
    .then((url) => { if (!audioController.signal.aborted && url) setExerciseAudioUrl(url) })
    .catch(() => {})
}
