import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AudioPlayButton } from '../audio/audio-play-button'
import { Spinner } from '../ui/spinner'
import { TutorAvatar } from '../ui/tutor-avatar'
import { CorrectionText } from './correction-text'
import { markdownComponents } from '../ui/markdown-config'
import type { Message } from '@/lib/types'

interface ChatBubbleProps {
  message: Message
  isAudioLoading?: boolean
  audioFailureHint?: string
}

export function ChatBubble({ message, isAudioLoading, audioFailureHint }: ChatBubbleProps) {
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
          {hasCorrections && message.segments ? (
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
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-muted/40" title={audioFailureHint} aria-label={audioFailureHint}>
              🔇
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}