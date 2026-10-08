import { describe, expect, it } from 'vitest'

import { emojiToCodepoint, getFlagSvgUrl } from '@/lib/twemoji'

const US = '\u{1F1FA}\u{1F1F8}'
const KR = '\u{1F1F0}\u{1F1F7}'
const JP = '\u{1F1EF}\u{1F1F5}'
const FR = '\u{1F1EB}\u{1F1F7}'

describe('emojiToCodepoint', () => {
  it('converts regional indicator pairs to twemoji filenames', () => {
    expect(emojiToCodepoint(US)).toBe('1f1fa-1f1f8')
    expect(emojiToCodepoint(KR)).toBe('1f1f0-1f1f7')
    expect(emojiToCodepoint(JP)).toBe('1f1ef-1f1f5')
  })

  it('strips variation selectors, which are not part of the filename', () => {
    expect(emojiToCodepoint('\u2764\uFE0F')).toBe('2764')
  })

  it('returns an empty string for empty input', () => {
    expect(emojiToCodepoint('')).toBe('')
  })
})

describe('getFlagSvgUrl', () => {
  it('builds a URL for each supported flag', () => {
    expect(getFlagSvgUrl(US)).toContain('/1f1fa-1f1f8.svg')
    expect(getFlagSvgUrl(KR)).toContain('/1f1f0-1f1f7.svg')
    expect(getFlagSvgUrl(JP)).toContain('/1f1ef-1f1f5.svg')
  })

  it('resolves flags outside the built-in three', () => {
    // Previously every unmapped emoji silently rendered the US flag.
    expect(getFlagSvgUrl(FR)).toContain('/1f1eb-1f1f7.svg')
    expect(getFlagSvgUrl(FR)).not.toBe(getFlagSvgUrl(US))
  })

  it('falls back to the US flag for unusable input', () => {
    expect(getFlagSvgUrl('')).toContain('/1f1fa-1f1f8.svg')
  })

  it('serves over https so it is not blocked as mixed content', () => {
    expect(getFlagSvgUrl(KR).startsWith('https://')).toBe(true)
  })

  it('does not depend on the retired twemoji.maxcdn.com host', () => {
    expect(getFlagSvgUrl(US)).not.toContain('maxcdn')
  })
})
