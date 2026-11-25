'use client'

import type { PracticeType } from '@/lib/api'

const MODES: { type: PracticeType; label: string }[] = [
  { type: 'grammar', label: 'Grammar' }, { type: 'vocabulary', label: 'Vocabulary' },
  { type: 'reading', label: 'Reading' }, { type: 'writing', label: 'Writing' },
  { type: 'translation', label: 'Translation' }, { type: 'mistake_review', label: 'Recent mistakes' },
]

interface PracticeModePickerProps { value: PracticeType; onChange: (type: PracticeType) => void; disabled?: boolean }

/** Controlled presentation-only selector for a new exercise's learning mode. */
export function PracticeModePicker({ value, onChange, disabled = false }: PracticeModePickerProps) {
  return <div className="flex flex-wrap gap-1.5" role="group" aria-label="Practice mode">
    {MODES.map(({ type, label }) => <button key={type} type="button" disabled={disabled} onClick={() => onChange(type)} aria-pressed={value === type}
      className="rounded-md border px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary">
      {label}
    </button>)}
  </div>
}
