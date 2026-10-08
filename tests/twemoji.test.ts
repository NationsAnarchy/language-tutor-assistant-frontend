import { describe, expect, it } from 'vitest'

import { getFlagSvgUrl } from '@/lib/twemoji'

describe('getFlagSvgUrl', () => {
  it('maps each supported flag to its twemoji codepoint', () => {
    expect(getFlagSvgUrl('🇺🇸')).toContain('/1f1fa-1f1f8.svg')
    expect(getFlagSvgUrl('🇰🇷')).toContain('/1f1f0-1f1f7.svg')
    expect(getFlagSvgUrl('🇯🇵')).toContain('/1f1ef-1f1f5.svg')
  })

  it('falls back to the US flag for an unmapped emoji', () => {
    expect(getFlagSvgUrl('🇫🇷')).toBe(getFlagSvgUrl('🇺🇸'))
  })

  it('serves over https so it is not blocked as mixed content', () => {
    expect(getFlagSvgUrl('🇰🇷').startsWith('https://')).toBe(true)
  })
})
