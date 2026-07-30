'use client'

export function LinguaLogo({ size = 'lg' }: { size?: 'xs' | 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'size-16' : size === 'sm' ? 'size-9' : 'size-7'
  const iconDim = size === 'lg' ? 'size-8' : size === 'sm' ? 'size-5' : 'size-4'
  const radius = size === 'lg' ? 'rounded-2xl' : size === 'sm' ? 'rounded-xl' : 'rounded-lg'
  return (
    <div className={`${dim} ${radius} bg-primary flex items-center justify-center shadow-md`}>
      <svg
        viewBox="0 0 32 32"
        className={`${iconDim} text-primary-foreground`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M6 10h10M6 16h7M6 22h5" strokeLinecap="round" />
        <path
          d="M20 8c4.418 0 8 3.134 8 7s-3.582 7-8 7a8.65 8.65 0 01-2.5-.366L13 24v-4.366C21 19.634 28 15.866 28 10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}