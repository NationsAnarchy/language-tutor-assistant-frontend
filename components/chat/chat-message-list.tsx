import type { RefObject } from 'react'
import type { Message } from '@/lib/types'
import { ChatBubble } from './chat-bubble'
import { ChatBubbleError } from './chat-bubble-error'

export interface MessageError { message: string; retryable: boolean }

export function ChatMessageList({ messages, audioLoadingId, audioFailures, errors, onRetry, onRetryAudio, onDismiss, endRef }: {
  messages: Message[]
  audioLoadingId: string | null
  audioFailures: Map<string, string>
  errors: Map<string, MessageError>
  onRetry: (id: string) => void
  onRetryAudio: (id: string) => void
  onDismiss: (id: string) => void
  endRef: RefObject<HTMLDivElement | null>
}) {
  return <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-5" aria-label="Conversation" aria-live="polite" aria-atomic="false">
    {messages.map((message) => {
      const error = errors.get(message.id)
      return <div key={message.id}>
        <ChatBubble message={message} isAudioLoading={audioLoadingId === message.id} audioFailureHint={audioFailures.get(message.id)} onRetryAudio={() => onRetryAudio(message.id)} />
        {error && <ChatBubbleError message={error.message} onRetry={error.retryable ? () => onRetry(message.id) : undefined} onDismiss={() => onDismiss(message.id)} />}
      </div>
    })}
    <div ref={endRef} />
  </main>
}
