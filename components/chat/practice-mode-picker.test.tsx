// @vitest-environment jsdom

import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PracticeModePicker } from './practice-mode-picker'

describe('PracticeModePicker', () => {
  let container: HTMLDivElement
  let root: Root

  it('emits the exact selected type for each accessible control', () => {
    const onChange = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(<PracticeModePicker value="grammar" onChange={onChange} />))
    const translation = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Translation')!
    act(() => translation.click())
    expect(onChange).toHaveBeenCalledWith('translation')
    const recentMistakes = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Recent mistakes')!
    recentMistakes.focus()
    expect(document.activeElement).toBe(recentMistakes)
    expect([...container.querySelectorAll('button')].find((button) => button.textContent === 'Grammar')?.getAttribute('aria-pressed')).toBe('true')
    root.unmount(); container.remove()
  })

  it('disables every mode while a request is active', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root.render(<PracticeModePicker value="grammar" onChange={vi.fn()} disabled />))
    expect([...container.querySelectorAll('button')].every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
    root.unmount(); container.remove()
  })
})
