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

// Assets come from jdecked/twemoji, the maintained fork of twitter/twemoji.
// The original `twemoji.maxcdn.com` host was retired along with MaxCDN, so it
// is no longer a safe dependency even though it still answers today.
const TWEMOJI_CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg'

/** Variation Selector-16 is not part of a twemoji filename. */
const VARIATION_SELECTOR_16 = 0xfe0f

const FALLBACK_FLAG = '🇺🇸'

/**
 * Convert an emoji to its twemoji filename stem, e.g. `🇺🇸` → `1f1fa-1f1f8`.
 *
 * Derived from the emoji itself rather than a small lookup table, so a flag
 * outside the three the app ships with resolves to the correct asset instead
 * of silently rendering the US flag.
 */
export function emojiToCodepoint(emoji: string): string {
  return Array.from(emoji)
    .map((char) => char.codePointAt(0))
    .filter((cp): cp is number => cp !== undefined && cp !== VARIATION_SELECTOR_16)
    .map((cp) => cp.toString(16))
    .join('-')
}

/**
 * Given a flag emoji string, returns the twemoji SVG URL.
 * Falls back to the US flag if the input has no codepoints.
 */
export function getFlagSvgUrl(emoji: string): string {
  const codepoint = emojiToCodepoint(emoji) || emojiToCodepoint(FALLBACK_FLAG)
  return `${TWEMOJI_CDN}/${codepoint}.svg`
}
