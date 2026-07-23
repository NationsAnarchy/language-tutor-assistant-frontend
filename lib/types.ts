export type Language = 'english' | 'korean' | 'japanese'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type ChatMode = 'chat' | 'exercise'
export type AudioState = 'idle' | 'loading' | 'playing' | 'paused'
export type PlaybackSpeed = 'normal' | 'slow'

export interface User {
  name: string
  email: string
  image?: string
}

export interface Session {
  language: Language
  level: Level
  exists: boolean
  session_id?: string
  title?: string
  updated_at?: string
}

export interface CorrectionSegment {
  type: 'text' | 'correction'
  content: string
  correction?: string
}

export interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  segments?: CorrectionSegment[]
  audioUrl?: string
  timestamp: Date
}

export interface ExerciseState {
  prompt: string
  audioUrl?: string
  answer: string
  submitted: boolean
}

export const LANGUAGES: { value: Language; label: string; nativeLabel: string; flag: string }[] = [
  { value: 'english', label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  { value: 'korean', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  { value: 'japanese', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
]

export const LEVELS: { value: Level; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Basic vocabulary and phrases' },
  { value: 'intermediate', label: 'Intermediate', description: 'Conversational fluency' },
  { value: 'advanced', label: 'Advanced', description: 'Nuanced grammar & idioms' },
]

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const CHAT_PLACEHOLDERS: Record<Language, string> = {
  english: 'Type in English...',
  korean: '한국어로 입력하세요...',
  japanese: '日本語で入力してください...',
}
