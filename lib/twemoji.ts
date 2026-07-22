/**
 * Maps flag emoji to twemoji SVG URLs for consistent cross-platform rendering.
 *
 * Raw emoji flags (🇺🇸, 🇰🇷, 🇯🇵) are Unicode Regional Indicator Symbol sequences.
 * On systems missing a color emoji font with flag ligature support (e.g. stripped-down
 * Windows builds, some Linux distros), they render as two separate letters (U+S, K+R, J+P)
 * or empty boxes.
 *
 * Using twemoji SVG images guarantees identical appearance on every OS and browser.
 */

const TWEMOJI_CDN = 'https://twemoji.maxcdn.com/v/14.0.2/svg'

// Pre-computed codepoints for our flag emojis
const FLAG_CODEPOINTS: Record<string, string> = {
  '🇺🇸': '1f1fa-1f1f8',
  '🇰🇷': '1f1f0-1f1f7',
  '🇯🇵': '1f1ef-1f1f5',
}

const FALLBACK_FLAG = '🇺🇸' // fallback if unknown

/**
 * Given a flag emoji string, returns the twemoji SVG URL.
 * Falls back to the US flag if the emoji isn't in our map.
 */
export function getFlagSvgUrl(emoji: string): string {
  const codepoint = FLAG_CODEPOINTS[emoji] ?? FLAG_CODEPOINTS[FALLBACK_FLAG]
  return `${TWEMOJI_CDN}/${codepoint}.svg`
}