import { describe, expect, it } from 'vitest'

import { failureMessage, formatTime, isRetryable } from '@/lib/hooks/use-audio-player'

describe('formatTime', () => {
  it('formats whole minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(600)).toBe('10:00')
  })

  it('truncates fractional seconds', () => {
    expect(formatTime(9.99)).toBe('0:09')
  })

  it('degrades gracefully for invalid input', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(Infinity)).toBe('0:00')
    expect(formatTime(-3)).toBe('0:00')
  })
})

describe('failureMessage', () => {
  it('returns a specific message per failure reason', () => {
    expect(failureMessage('network')).toMatch(/connection/i)
    expect(failureMessage('decode')).toMatch(/decoded/i)
    expect(failureMessage('unsupported')).toMatch(/not supported/i)
    expect(failureMessage('aborted')).toMatch(/cancelled/i)
    expect(failureMessage('unknown')).toBe("Couldn't play audio.")
  })
})

describe('isRetryable', () => {
  it('allows retrying transient failures', () => {
    expect(isRetryable('network')).toBe(true)
    expect(isRetryable('decode')).toBe(true)
    expect(isRetryable('aborted')).toBe(true)
    expect(isRetryable('unknown')).toBe(true)
  })

  it('treats an unsupported format as permanent', () => {
    expect(isRetryable('unsupported')).toBe(false)
  })
})
