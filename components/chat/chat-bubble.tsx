import { memo } from 'react'
import { RefreshCw } from 'lucide-react'
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
  onRetryAudio?: () => void
}

export const ChatBubble = memo(function ChatBubble({ message, isAudioLoading, audioFailureHint, onRetryAudio }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const hasCorrections = message.segments?.some((s) => s.type === 'correction')
  const canGenerateAudio = Boolean(message.content && onRetryAudio)

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
          ) : audioFailureHint || canGenerateAudio ? (
            <button
              type="button"
              onClick={onRetryAudio}
              className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground px-1.5 py-1 rounded-md bg-muted/60 hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title={audioFailureHint || 'Generate audio for this message'}
              aria-label={audioFailureHint ? 'Retry audio generation' : 'Generate audio for this message'}
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              {audioFailureHint ? 'Retry audio' : 'Generate audio'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
})
