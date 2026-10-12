import { describe, it, expect } from 'vitest'
import { useChatMessages } from '@/lib/hooks/use-chat-messages'
import { useTtsAudio } from '@/lib/hooks/use-tts-audio'
import { useExerciseMode } from '@/lib/hooks/use-exercise-mode'

describe('Chat Custom Hooks exports', () => {
  it('exports useChatMessages hook function', () => {
    expect(typeof useChatMessages).toBe('function')
  })

  it('exports useTtsAudio hook function', () => {
    expect(typeof useTtsAudio).toBe('function')
  })

  it('exports useExerciseMode hook function', () => {
    expect(typeof useExerciseMode).toBe('function')
  })
})
