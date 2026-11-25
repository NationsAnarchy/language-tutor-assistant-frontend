// @vitest-environment jsdom

import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExercisePanel } from './exercise-panel'

describe('ExercisePanel', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('renders Hint button when onRequestHint is provided and triggers callback on click', () => {
    const onRequestHint = vi.fn()
    act(() => {
      root.render(
        <ExercisePanel
          language="english"
          onSubmitAnswer={vi.fn()}
          onRequestNew={vi.fn()}
          onRequestHint={onRequestHint}
          practiceType="grammar"
          onPracticeTypeChange={vi.fn()}
          isLoading={false}
          currentExercise={{ prompt: 'Fill in the blank: I ___ home.' }}
          isOpen={true}
          onClose={vi.fn()}
        />
      )
    })

    const hintButton = [...container.querySelectorAll('button')].find(
      (btn) => btn.getAttribute('aria-label') === 'Request a hint'
    )
    expect(hintButton).toBeTruthy()
    expect(hintButton?.textContent).toContain('Hint')

    act(() => {
      hintButton?.click()
    })
    expect(onRequestHint).toHaveBeenCalledTimes(1)
  })

  it('disables Hint button when loading or no active exercise exists', () => {
    act(() => {
      root.render(
        <ExercisePanel
          language="english"
          onSubmitAnswer={vi.fn()}
          onRequestNew={vi.fn()}
          onRequestHint={vi.fn()}
          practiceType="grammar"
          onPracticeTypeChange={vi.fn()}
          isLoading={true}
          currentExercise={{ prompt: 'Some prompt' }}
          isOpen={true}
          onClose={vi.fn()}
        />
      )
    })

    const hintButton = [...container.querySelectorAll('button')].find(
      (btn) => btn.getAttribute('aria-label') === 'Request a hint'
    ) as HTMLButtonElement | undefined
    expect(hintButton?.disabled).toBe(true)
  })
})
