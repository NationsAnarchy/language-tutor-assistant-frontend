'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Languages, BookOpen, Mic, Type } from 'lucide-react'
import { getMistakes, MistakeEntry } from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'

interface MistakesPanelProps {
  sessionId: string
}

const TYPE_ICONS: Record<MistakeEntry['type'], typeof Languages> = {
  grammar: Languages,
  vocabulary: BookOpen,
  pronunciation: Mic,
  spelling: Type,
}

const TYPE_LABELS: Record<MistakeEntry['type'], string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  pronunciation: 'Pronunciation',
  spelling: 'Spelling',
}

const TYPE_COLORS: Record<MistakeEntry['type'], string> = {
  grammar: 'text-blue-600 border-blue-200 bg-blue-50',
  vocabulary: 'text-green-600 border-green-200 bg-green-50',
  pronunciation: 'text-purple-600 border-purple-200 bg-purple-50',
  spelling: 'text-orange-600 border-orange-200 bg-orange-50',
}

function groupByType(mistakes: MistakeEntry[]): Record<MistakeEntry['type'], MistakeEntry[]> {
  const grouped: Record<string, MistakeEntry[]> = {
    grammar: [],
    vocabulary: [],
    pronunciation: [],
    spelling: [],
  }
  for (const m of mistakes) {
    if (grouped[m.type]) grouped[m.type].push(m)
  }
  return grouped as Record<MistakeEntry['type'], MistakeEntry[]>
}

export function MistakesPanel({ sessionId }: MistakesPanelProps) {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getMistakes(sessionId)
      .then((data) => {
        if (!cancelled) setMistakes(data)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load mistakes right now.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 px-3">
        <AlertTriangle className="size-4 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (mistakes.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 px-3">
        <AlertTriangle className="size-4 shrink-0 text-green-500" />
        <span>No mistakes yet — keep practicing!</span>
      </div>
    )
  }

  const grouped = groupByType(mistakes)

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {mistakes.length} mistake{mistakes.length !== 1 ? 's' : ''} to review
      </p>
      {(['grammar', 'vocabulary', 'pronunciation', 'spelling'] as const).map((type) => {
        const items = grouped[type]
        if (items.length === 0) return null
        const Icon = TYPE_ICONS[type]
        return (
          <div key={type}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="size-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {TYPE_LABELS[type]}
              </span>
              <span className="text-[10px] text-muted-foreground/60 ml-auto">{items.length}</span>
            </div>
            <div className="space-y-1">
              {items.map((m, i) => (
                <div
                  key={i}
                  className={`text-xs rounded-md border px-2.5 py-1.5 leading-relaxed ${TYPE_COLORS[type]}`}
                >
                  {m.detail}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}