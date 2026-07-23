'use client'

import type { CorrectionSegment } from '@/lib/types'

interface CorrectionTextProps {
  segments: CorrectionSegment[]
}

/**
 * Renders a message that includes grammar/vocabulary corrections inline.
 * Each correction shows the original (struck through) above the corrected form.
 */
export function CorrectionText({ segments }: CorrectionTextProps) {
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
              <span
                className="line-through text-muted-foreground/60 text-[11px] leading-tight px-0.5"
                aria-hidden="true"
              >
                {seg.content}
              </span>
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