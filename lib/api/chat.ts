'use client'

import { backendAudioUrl } from './config'
import { authenticatedRequest } from './client'
import { ApiError } from './errors'

export interface ChatResult { reply: string; intent: string; audio_url: string | null }
export interface ChatStreamEvent { type: 'token' | 'done' | 'error'; content?: string; intent?: string; message?: string }
export async function sendChatStream(sessionId: string, message: string, onEvent: (event: ChatStreamEvent) => void, signal?: AbortSignal): Promise<{ reply: string; intent: string }> {
  const response = await authenticatedRequest('/chat', { method: 'POST', body: JSON.stringify({ session_id: sessionId, message }), signal })
  const reader = response.body?.getReader(); if (!reader) throw new ApiError(0, 'Streaming not supported by the browser.')
  const decoder = new TextDecoder(); let reply = ''; let intent = 'chat'; let buffer = ''
  try { while (true) { const { done, value } = await reader.read(); if (done) break; if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError'); buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) { if (!line.startsWith('data: ')) continue; try { const event = JSON.parse(line.slice(6).trim()) as ChatStreamEvent; onEvent(event); if (event.type === 'token' && event.content) reply += event.content; if (event.type === 'done') intent = event.intent || 'chat'; if (event.type === 'error') throw new ApiError(500, event.message || 'Stream error.', 'server', true) } catch (error) { if (error instanceof ApiError) throw error } } } } finally { reader.releaseLock() }
  return { reply, intent }
}
/** @deprecated Use sendChatStream for streamed responses. */
export async function sendChat(sessionId: string, message: string, signal?: AbortSignal): Promise<ChatResult> { return (await authenticatedRequest('/chat', { method: 'POST', body: JSON.stringify({ session_id: sessionId, message }), signal })).json() }
export async function synthesizeAudio(sessionId: string, messageContent: string, signal?: AbortSignal): Promise<string | null> { const response = await authenticatedRequest(`/session/${sessionId}/tts`, { method: 'POST', body: JSON.stringify({ content: messageContent }), signal }); return URL.createObjectURL(await response.blob()) }
export function audioUrl(filename: string | null): string | null { return filename ? backendAudioUrl(filename) : null }
export function getCachedAudioUrl(audioHash: string): string | null { return audioUrl(`${audioHash}.mp3`) }
