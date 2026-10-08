import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b')
  })

  it('lets later Tailwind utilities win over earlier ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
    expect(cn('text-muted-foreground', 'text-foreground')).toBe('text-foreground')
  })

  it('supports conditional object syntax', () => {
    expect(cn({ 'text-primary': true, 'text-destructive': false })).toBe('text-primary')
  })
})
