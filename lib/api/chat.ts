'use client'

import { backendAudioUrl } from './config'
import { authenticatedRequest } from './client'
import { ApiError } from './errors'

export type PracticeType = 'grammar' | 'vocabulary' | 'reading' | 'writing' | 'translation' | 'mistake_review'
export interface ChatStreamEvent { type: 'token' | 'done' | 'error'; content?: string; intent?: string; message?: string; practice_type?: PracticeType | null }
export interface ChatStreamOptions { practiceType?: PracticeType; signal?: AbortSignal }
export async function sendChatStream(sessionId: string, message: string, onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal, options: Omit<ChatStreamOptions, 'signal'> = {}): Promise<{ reply: string; intent: string }> {
  const { practiceType } = options
  const body = practiceType ? { session_id: sessionId, message, practice_type: practiceType } : { session_id: sessionId, message }
  const response = await authenticatedRequest('/chat', { method: 'POST', body: JSON.stringify(body), signal })
  const reader = response.body?.getReader(); if (!reader) throw new ApiError(0, 'Streaming not supported by the browser.')
  const decoder = new TextDecoder(); let reply = ''; let intent = 'chat'; let buffer = ''
  const consume = (frame: string) => {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n')
    if (!data) return
    let event: ChatStreamEvent
    try { event = JSON.parse(data) as ChatStreamEvent } catch { return }
    onEvent(event)
    if (event.type === 'token' && event.content) reply += event.content
    if (event.type === 'done') intent = event.intent || 'chat'
    if (event.type === 'error') throw new ApiError(500, event.message || 'Stream error.', 'server', true)
  }
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split(/\r?\n\r?\n/); buffer = frames.pop() || ''
      frames.forEach(consume)
    }
    buffer += decoder.decode()
    if (buffer.trim()) consume(buffer)
  } finally { reader.releaseLock() }
  return { reply, intent }
}
export async function synthesizeAudio(sessionId: string, messageContent: string, signal?: AbortSignal): Promise<string | null> { const response = await authenticatedRequest(`/session/${sessionId}/tts`, { method: 'POST', body: JSON.stringify({ content: messageContent }), signal }); return URL.createObjectURL(await response.blob()) }
export function audioUrl(filename: string | null): string | null { return filename ? backendAudioUrl(filename) : null }
export function getCachedAudioUrl(audioHash: string): string | null { return audioUrl(`${audioHash}.mp3`) }
