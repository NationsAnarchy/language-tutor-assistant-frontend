import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { AudioPlayButton } from './audio-play-button'
import { Spinner } from './ui/spinner'
import type { Message, CorrectionSegment } from '@/lib/types'

/** Shared prose styles for markdown content inside chat bubbles. */
const markdownComponents = {
  p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-1.5 last:mb-0 leading-relaxed" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc pl-4 mb-1.5 last:mb-0 space-y-0.5" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal pl-4 mb-1.5 last:mb-0 space-y-0.5" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) => (
    <li className="leading-relaxed" {...props}>{children}</li>
  ),
  code: ({ children, className, ...props }: React.ComponentPropsWithoutRef<'code'>) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="px-1 py-0.5 rounded text-[0.85em] bg-black/10 font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className={`block px-3 py-2 rounded-lg text-[0.85em] bg-black/10 font-mono overflow-x-auto mb-1.5 ${className || ''}`} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => (
    <pre className="mb-1.5 last:mb-0 overflow-x-auto" {...props}>{children}</pre>
  ),
  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold" {...props}>{children}</strong>
  ),
  h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-base font-bold mb-1.5" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-sm font-bold mb-1.5" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-sm font-semibold mb-1" {...props}>{children}</h3>
  ),
  blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-2 border-current/30 pl-3 italic opacity-80 mb-1.5 last:mb-0" {...props}>{children}</blockquote>
  ),
  a: ({ children, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
    <a className="underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
}

interface ChatBubbleProps {
  message: Message
  isAudioLoading?: boolean
  /** Short hint shown when audio synthesis failed (e.g. "Audio unavailable"). */
  audioFailureHint?: string
}

function TutorAvatar() {
  return (
    <div
      className="size-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-primary border border-primary/20"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M3 5h6M3 8h4" strokeLinecap="round" />
        <path
          d="M10 3c2.761 0 5 1.791 5 4s-2.239 4-5 4a5.54 5.54 0 01-1.563-.224L6 12V9.776C8.5 9.776 13 7.791 13 5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function CorrectionText({ segments }: { segments: CorrectionSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'correction') {
          return (
            <span
              key={i}
              className="inline-flex flex-col gap-px mx-0.5 align-middle"
              role="mark"
              aria-label={`Correction: replace "${seg.content}" with "${seg.correction ?? seg.content}"`}
            >
              {/* Original (struck through) */}
              <span
                className="line-through text-muted-foreground/60 text-[11px] leading-tight px-0.5"
                aria-hidden="true"
              >
                {seg.content}
              </span>
              {/* Corrected form */}
              <span
                className="px-1.5 py-0.5 rounded-md text-xs font-semibold leading-tight"
                style={{
                  backgroundColor: 'var(--correction-bg)',
                  color: 'var(--correction-text)',
                  border: '1px solid var(--correction-border)',
                }}
              >
                {seg.correction ?? seg.content}
              </span>
            </span>
          )
        }
        return <span key={i}>{seg.content}</span>
      })}
    </>
  )
}

export function ChatBubble({ message, isAudioLoading, audioFailureHint }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const hasCorrections = message.segments?.some((s) => s.type === 'correction')

  if (isUser) {
    return (
      <div className="flex justify-end" role="article" aria-label="Your message">
        <div className="max-w-[78%] sm:max-w-[65%]">
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm leading-relaxed shadow-sm markdown-user">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  // Agent message
  return (
    <div className="flex items-end gap-2" role="article" aria-label="Tutor message">
      <TutorAvatar />

      <div className="flex items-end gap-2 max-w-[78%] sm:max-w-[65%]">
        <div
          className={cn(
            'px-4 py-3 rounded-2xl rounded-bl-sm bg-card border border-border text-sm leading-relaxed shadow-sm',
            hasCorrections && 'pb-4'
          )}
        >
          {hasCorrections && message.segments ? (
            <div>
              {/* Correction badge */}
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold mb-2.5 px-2 py-1 rounded-full"
                style={{
                  backgroundColor: 'var(--correction-bg)',
                  color: 'var(--correction-text)',
                  border: '1px solid var(--correction-border)',
                }}
                aria-label="This message contains a correction"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
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
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Unobtrusive audio button, loading spinner, or failure hint */}
        {message.audioUrl ? (
          <AudioPlayButton
            audioUrl={message.audioUrl}
            className="mb-0.5 shrink-0"
          />
        ) : isAudioLoading ? (
          <Spinner size="sm" className="mb-0.5 shrink-0" />
        ) : audioFailureHint ? (
          <span
            className="mb-0.5 shrink-0 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-muted/40"
            title={audioFailureHint}
            aria-label={audioFailureHint}
          >
            🔇
          </span>
        ) : null}
      </div>
    </div>
  )
}
