// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Message } from '@/lib/types'

let emitToken: ((event: { type: 'token'; content: string }) => void) | undefined
let rejectStream: ((error: Error) => void) | undefined
let streamSignal: AbortSignal | undefined

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  handleApiError: vi.fn(() => ({ message: 'Request failed', retryable: true })),
  invalidateSessionCache: vi.fn(),
  sendChatStream: vi.fn((_sessionId, _content, onEvent, signal) => new Promise((_resolve, reject) => {
    emitToken = onEvent
    rejectStream = reject
    streamSignal = signal
  })),
  synthesizeAudio: vi.fn(),
}))

import { useChatWorkflow } from './use-chat-workflow'
import * as api from '@/lib/api'

let workflow: ReturnType<typeof useChatWorkflow>
function Harness({ sessionId, initialMessages, onWorkflow }: { sessionId: string; initialMessages: Message[]; onWorkflow: (value: ReturnType<typeof useChatWorkflow>) => void }) {
  const value = useChatWorkflow({ sessionId, language: 'english', initialMessages, router: { replace: vi.fn() } })
  useEffect(() => { onWorkflow(value) }, [onWorkflow, value])
  return null
}

describe('useChatWorkflow session changes', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.mocked(api.handleApiError).mockReset()
    vi.mocked(api.handleApiError).mockReturnValue({ message: 'Request failed', retryable: true })
    vi.mocked(api.invalidateSessionCache).mockReset()
    vi.mocked(api.sendChatStream).mockReset()
    vi.mocked(api.synthesizeAudio).mockReset()
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    container?.remove()
    vi.restoreAllMocks()
    emitToken = undefined
    rejectStream = undefined
    streamSignal = undefined
  })

  it('aborts an in-flight submit and rejects stale tokens and errors after switching sessions', async () => {
    const oldMessages: Message[] = []
    const newMessages: Message[] = [{ id: 'history-0', role: 'agent', content: 'New conversation', timestamp: new Date() }]
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    const captureWorkflow = (value: ReturnType<typeof useChatWorkflow>) => { workflow = value }
    await act(async () => { root.render(<Harness sessionId="old" initialMessages={oldMessages} onWorkflow={captureWorkflow} />) })
    let submitPromise!: Promise<boolean>
    await act(async () => { submitPromise = workflow.submit('old message') })
    expect(workflow.isLoading).toBe(true)

    await act(async () => { root.render(<Harness sessionId="new" initialMessages={newMessages} onWorkflow={captureWorkflow} />) })
    expect(streamSignal?.aborted).toBe(true)
    expect(workflow.isLoading).toBe(false)
    expect(workflow.messages).toEqual(newMessages)

    await act(async () => {
      emitToken?.({ type: 'token', content: ' stale token' })
      rejectStream?.(new Error('old request failed'))
      await submitPromise
    })
    expect(workflow.messages).toEqual(newMessages)
    expect(workflow.messageErrors).toEqual(new Map())
  })

  it('accumulates a successful stream, invalidates the cache, and attaches synthesized audio', async () => {
    const initialMessages: Message[] = []
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const captureWorkflow = (value: ReturnType<typeof useChatWorkflow>) => { workflow = value }
    vi.mocked(api.sendChatStream).mockImplementation(async (_sessionId, _content, onEvent) => {
      onEvent({ type: 'token', content: 'Hello' })
      onEvent({ type: 'token', content: '!' })
      return { reply: 'Hello!', intent: 'chat' }
    })
    vi.mocked(api.synthesizeAudio).mockResolvedValue('blob:reply')

    await act(async () => { root.render(<Harness sessionId="session-1" initialMessages={initialMessages} onWorkflow={captureWorkflow} />) })
    await act(async () => {
      await workflow.submit('Hi')
      await Promise.resolve()
    })

    expect(workflow.isLoading).toBe(false)
    expect(workflow.messages).toHaveLength(2)
    expect(workflow.messages[1]).toMatchObject({ role: 'agent', content: 'Hello!', audioUrl: 'blob:reply' })
    expect(api.invalidateSessionCache).toHaveBeenCalledWith('session-1')
  })

  it('releases generated audio URLs exactly once when the session changes', async () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const captureWorkflow = (value: ReturnType<typeof useChatWorkflow>) => { workflow = value }
    vi.mocked(api.sendChatStream).mockResolvedValue({ reply: 'Tutor reply', intent: 'chat' })
    vi.mocked(api.synthesizeAudio).mockResolvedValue('blob:session-one')

    await act(async () => { root.render(<Harness sessionId="session-1" initialMessages={[]} onWorkflow={captureWorkflow} />) })
    await act(async () => {
      await workflow.submit('Hi')
      await Promise.resolve()
    })
    await act(async () => { root.render(<Harness sessionId="session-2" initialMessages={[]} onWorkflow={captureWorkflow} />) })

    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:session-one')
  })

  it('releases generated audio URLs exactly once when the workflow unmounts', async () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const captureWorkflow = (value: ReturnType<typeof useChatWorkflow>) => { workflow = value }
    vi.mocked(api.sendChatStream).mockResolvedValue({ reply: 'Tutor reply', intent: 'chat' })
    vi.mocked(api.synthesizeAudio).mockResolvedValue('blob:unmount')

    await act(async () => { root.render(<Harness sessionId="session-1" initialMessages={[]} onWorkflow={captureWorkflow} />) })
    await act(async () => {
      await workflow.submit('Hi')
      await Promise.resolve()
    })
    await act(async () => root.unmount())

    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:unmount')
  })

  it('attaches a retryable inline error when streaming fails', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const captureWorkflow = (value: ReturnType<typeof useChatWorkflow>) => { workflow = value }
    vi.mocked(api.sendChatStream).mockRejectedValue(new Error('stream failed'))
    vi.mocked(api.handleApiError).mockReturnValue({ message: 'Try again', retryable: true })

    await act(async () => { root.render(<Harness sessionId="session-1" initialMessages={[]} onWorkflow={captureWorkflow} />) })
    await act(async () => { await workflow.submit('Hi') })

    const userMessage = workflow.messages.find((message) => message.role === 'user')!
    expect(workflow.isLoading).toBe(false)
    expect(workflow.messageErrors.get(userMessage.id)).toMatchObject({ message: 'Try again', retryable: true, originalContent: 'Hi' })
  })

  it('keeps chat completion available when audio synthesis fails', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const captureWorkflow = (value: ReturnType<typeof useChatWorkflow>) => { workflow = value }
    vi.mocked(api.sendChatStream).mockResolvedValue({ reply: 'Tutor reply', intent: 'chat' })
    vi.mocked(api.synthesizeAudio).mockRejectedValue(new Error('tts unavailable'))

    await act(async () => { root.render(<Harness sessionId="session-1" initialMessages={[]} onWorkflow={captureWorkflow} />) })
    await act(async () => {
      await workflow.submit('Hi')
      await Promise.resolve()
    })

    const agentMessage = workflow.messages.find((message) => message.role === 'agent')!
    expect(workflow.isLoading).toBe(false)
    expect(agentMessage.content).toBe('')
    expect(workflow.audioFailures.get(agentMessage.id)).toBe('Audio unavailable.')
  })

  it('retries audio for an existing tutor message without submitting another chat turn', async () => {
    const message: Message = { id: 'agent-1', role: 'agent', content: 'Tutor reply', timestamp: new Date() }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const captureWorkflow = (value: ReturnType<typeof useChatWorkflow>) => { workflow = value }
    vi.mocked(api.synthesizeAudio).mockResolvedValue('blob:retried-audio')

    await act(async () => { root.render(<Harness sessionId="session-1" initialMessages={[message]} onWorkflow={captureWorkflow} />) })
    await act(async () => {
      await workflow.retryAudio(message.id)
      await Promise.resolve()
    })

    expect(api.synthesizeAudio).toHaveBeenCalledWith('session-1', 'Tutor reply', expect.any(AbortSignal))
    expect(api.sendChatStream).not.toHaveBeenCalled()
    expect(workflow.messages[0].audioUrl).toBe('blob:retried-audio')
    expect(workflow.audioFailures.has(message.id)).toBe(false)
  })

  it('sends an explicit practice type through the shared stream and hands its audio to the caller once', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const captureWorkflow = (value: ReturnType<typeof useChatWorkflow>) => { workflow = value }
    const onComplete = vi.fn()
    const onAudio = vi.fn()
    vi.mocked(api.sendChatStream).mockResolvedValue({ reply: 'Practice prompt', intent: 'exercise_request' })
    vi.mocked(api.synthesizeAudio).mockResolvedValue('blob:practice')

    await act(async () => { root.render(<Harness sessionId="session-1" initialMessages={[]} onWorkflow={captureWorkflow} />) })
    await act(async () => {
      await workflow.requestPractice('mistake_review', { onComplete, onAudio })
      await Promise.resolve()
    })

    expect(api.sendChatStream).toHaveBeenCalledWith(
      'session-1', expect.stringContaining('recent mistakes'), expect.any(Function), expect.any(AbortSignal),
      { practiceType: 'mistake_review' },
    )
    expect(onComplete).toHaveBeenCalledWith('Practice prompt')
    expect(api.synthesizeAudio).toHaveBeenCalledTimes(1)
    expect(onAudio).toHaveBeenCalledWith('blob:practice')
  })
})
