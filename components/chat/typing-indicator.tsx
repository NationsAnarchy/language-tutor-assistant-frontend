import { TutorAvatar } from '../ui/tutor-avatar'

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" role="status" aria-label="Tutor is typing">
      <TutorAvatar />
      <div className="px-4 py-3.5 rounded-2xl rounded-bl-sm bg-card border border-border shadow-sm flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.1s' }} aria-hidden="true" />
        <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '180ms', animationDuration: '1.1s' }} aria-hidden="true" />
        <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '360ms', animationDuration: '1.1s' }} aria-hidden="true" />
      </div>
      <span className="sr-only">Tutor is composing a response...</span>
    </div>
  )
}