import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const SIZE_MAP = { sm: 'size-4', md: 'size-6', lg: 'size-8' }

export function Spinner({ className, size = 'md', label }: SpinnerProps) {
  return (
    <div
      className={cn('flex items-center gap-2 text-muted-foreground', className)}
      role="status"
      aria-label={label || 'Loading'}
    >
      <Loader2
        className={cn(SIZE_MAP[size], 'animate-spin text-primary')}
        aria-hidden="true"
      />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}