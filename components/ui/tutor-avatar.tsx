/**
 * Tutor avatar — the small speech-bubble icon used in agent chat bubbles
 * and the typing indicator.
 */
export function TutorAvatar() {
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