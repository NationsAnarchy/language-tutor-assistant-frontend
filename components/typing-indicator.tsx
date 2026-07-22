export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" role="status" aria-label="Tutor is typing">
      {/* Tutor avatar */}
      <div
        className="size-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 text-primary border border-primary/20"
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

      {/* Bouncing dots bubble */}
      <div className="px-4 py-3.5 rounded-2xl rounded-bl-sm bg-card border border-border shadow-sm flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '1.1s' }}
          aria-hidden="true"
        />
        <span
          className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: '180ms', animationDuration: '1.1s' }}
          aria-hidden="true"
        />
        <span
          className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: '360ms', animationDuration: '1.1s' }}
          aria-hidden="true"
        />
      </div>

      <span className="sr-only">Tutor is composing a response...</span>
    </div>
  )
}
