import { getFlagSvgUrl } from '@/lib/twemoji'
import { cn } from '@/lib/utils'

interface FlagProps {
  emoji: string
  className?: string
}

/**
 * Renders a flag emoji as a twemoji SVG image for consistent cross-platform
 * appearance. Used by language-picker, session-sidebar, and top-bar.
 */
export function Flag({ emoji, className }: FlagProps) {
  return (
    // The source is a small, externally hosted SVG generated from an emoji;
    // Next image optimization does not benefit this presentation-only asset.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getFlagSvgUrl(emoji)}
      alt=""
      className={cn('inline-block size-[1em] align-text-bottom', className)}
      draggable={false}
    />
  )
}
