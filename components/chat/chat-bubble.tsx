import { memo, useState } from 'react'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AudioPlayButton } from '../audio/audio-play-button'
import { Spinner } from '../ui/spinner'
import { TutorAvatar } from '../ui/tutor-avatar'
import { CorrectionText } from './correction-text'
import { TypingIndicator } from './typing-indicator'
import { markdownComponents } from '../ui/markdown-config'
import type { Message } from '@/lib/types'

interface ChatBubbleProps {
  message: Message
  isAudioLoading?: boolean
  audioFailureHint?: string
  onRetryAudio?: (messageId: string, content: string) => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard error
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center size-6 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={copied ? 'Copied to clipboard' : 'Copy message'}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? <Check className="size-3 text-emerald-500" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
    </button>
  )
}

function ChatBubbleComponent({ message, isAudioLoading, audioFailureHint, onRetryAudio }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const hasCorrections = message.segments?.some((s) => s.type === 'correction')

  if (isUser) {
    return (
      <div className="flex justify-end" role="article" aria-label="Your message">
        <div className="max-w-[85%] sm:max-w-[65%]">
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm leading-relaxed shadow-sm markdown-user">
            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2" role="article" aria-label="Tutor message">
      <TutorAvatar />
      <div className="flex flex-col gap-1.5 max-w-[85%] sm:max-w-[65%]">
        <div
          className={cn(
            'px-4 py-3 rounded-2xl rounded-bl-sm bg-card border border-border text-sm leading-relaxed shadow-sm',
            hasCorrections && 'pb-4'
          )}
        >
          {!message.content ? (
            <TypingIndicator />
          ) : hasCorrections && message.segments ? (
            <div>
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold mb-2.5 px-2 py-1 rounded-full"
                style={{
                  backgroundColor: 'var(--correction-bg)',
                  color: 'var(--correction-text)',
                  border: '1px solid var(--correction-border)',
                }}
                aria-label="This message contains a correction"
              >
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M2 8h6M5 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
                </svg>
                Correction
              </div>
              <p className="text-foreground">
                <CorrectionText segments={message.segments} />
              </p>
            </div>
          ) : (
            <div className="text-foreground markdown-agent">
              <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 pl-1">
          {message.audioUrl ? (
            <AudioPlayButton audioUrl={message.audioUrl} className="shrink-0" />
          ) : isAudioLoading ? (
            <Spinner size="sm" className="shrink-0" />
          ) : audioFailureHint ? (
            <button
              type="button"
              onClick={() => onRetryAudio?.(message.id, message.content)}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted transition-colors border border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={`${audioFailureHint} Click to retry.`}
              aria-label="Retry audio generation"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              <span>Retry audio</span>
            </button>
          ) : null}
          {message.content && <CopyButton text={message.content} />}
        </div>
      </div>
    </div>
  )
}

export const ChatBubble = memo(ChatBubbleComponent)