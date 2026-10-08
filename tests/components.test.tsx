import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { ChatBubble } from '@/components/chat/chat-bubble'
import { SessionItem } from '@/components/layout/session-item'
import { ExercisePanel } from '@/components/chat/exercise-panel'
import { markdownComponents } from '@/components/ui/markdown-config'
import type { Message, Session } from '@/lib/types'

describe('ChatBubble component', () => {
  it('renders tutor message with Copy button and markdown text', () => {
    const message: Message = {
      id: 'msg-1',
      role: 'agent',
      content: 'Hello, welcome to your Korean lesson!',
      timestamp: new Date(),
    }

    const html = renderToStaticMarkup(
      <ChatBubble
        message={message}
      />
    )

    expect(html).toContain('Hello, welcome to your Korean lesson!')
    expect(html).toContain('Copy message')
    expect(html).toContain('Tutor')
  })

  it('does not render Copy button on user messages', () => {
    const message: Message = {
      id: 'msg-2',
      role: 'user',
      content: '안녕하세요!',
      timestamp: new Date(),
    }

    const html = renderToStaticMarkup(
      <ChatBubble
        message={message}
      />
    )

    expect(html).toContain('안녕하세요!')
    expect(html).not.toContain('Copy message')
  })

  it('renders audio retry button when audio generation fails', () => {
    const message: Message = {
      id: 'msg-3',
      role: 'agent',
      content: 'Audio failed turn',
      timestamp: new Date(),
    }

    const onRetryAudio = vi.fn()

    const html = renderToStaticMarkup(
      <ChatBubble
        message={message}
        audioFailureHint="Audio unavailable."
        onRetryAudio={onRetryAudio}
      />
    )

    expect(html).toContain('Retry audio generation')
    expect(html).toContain('Retry audio')
    expect(html).toContain('Audio unavailable.')
  })

  it('renders audio play button when audioUrl is provided', () => {
    const message: Message = {
      id: 'msg-4',
      role: 'agent',
      content: 'With audio',
      audioUrl: 'http://test.audio/sample.mp3',
      timestamp: new Date(),
    }

    const html = renderToStaticMarkup(
      <ChatBubble
        message={message}
      />
    )

    expect(html).toContain('Play audio')
  })
})

describe('SessionItem component', () => {
  const session: Session = {
    session_id: 'sess-123',
    language: 'korean',
    level: 'intermediate',
    exists: true,
    title: 'Daily Conversational Korean',
    updated_at: '2026-10-08T01:00:00Z',
  }

  it('renders session title and action buttons', () => {
    const html = renderToStaticMarkup(
      <SessionItem
        session={session}
        isActive={false}
        onSelect={() => {}}
      />
    )

    expect(html).toContain('Daily Conversational Korean')
    expect(html).toContain('Rename session')
    expect(html).toContain('Delete session')
  })

  it('renders active state styling when isActive is true', () => {
    const html = renderToStaticMarkup(
      <SessionItem
        session={session}
        isActive={true}
        onSelect={() => {}}
      />
    )

    expect(html).toContain('bg-primary/10 text-primary')
  })

  it('renders fallback level label when title is missing', () => {
    const untitledSession: Session = {
      ...session,
      title: undefined,
    }

    const html = renderToStaticMarkup(
      <SessionItem
        session={untitledSession}
        isActive={false}
        onSelect={() => {}}
      />
    )

    expect(html).toContain('Intermediate')
  })
})

describe('ExercisePanel component', () => {
  it('renders empty prompt CTA when no current exercise is active', () => {
    const html = renderToStaticMarkup(
      <ExercisePanel
        language="korean"
        onSubmitAnswer={() => {}}
        onRequestNew={() => {}}
        isLoading={false}
      />
    )

    expect(html).toContain('New exercise')
    expect(html).toContain('to get started.')
  })

  it('renders prompt card and correct language placeholder', () => {
    const html = renderToStaticMarkup(
      <ExercisePanel
        language="korean"
        onSubmitAnswer={() => {}}
        onRequestNew={() => {}}
        isLoading={false}
        currentExercise={{
          prompt: 'Translate: "Hello my friend"',
          audioUrl: 'http://test.audio/ex.mp3',
        }}
      />
    )

    expect(html).toContain('Translate: &quot;Hello my friend&quot;')
    expect(html).toContain('한국어로 답을 입력하세요...')
    expect(html).toContain('Play audio')
    expect(html).toContain('Submit answer')
  })
})

describe('markdownComponents styling', () => {
  it('applies dark-mode contrast classes to inline code', () => {
    const CodeComponent = markdownComponents.code as React.FC<{ children: React.ReactNode }>
    const html = renderToStaticMarkup(
      <CodeComponent>const x = 1;</CodeComponent>
    )

    expect(html).toContain('bg-muted/80')
    expect(html).toContain('text-foreground')
    expect(html).toContain('border-border/40')
    expect(html).toContain('font-mono')
  })

  it('applies dark-mode contrast classes to code blocks', () => {
    const CodeComponent = markdownComponents.code as React.FC<{ children: React.ReactNode; className?: string }>
    const html = renderToStaticMarkup(
      <CodeComponent className="language-js">console.log(&apos;test&apos;);</CodeComponent>
    )

    expect(html).toContain('block')
    expect(html).toContain('bg-muted/80')
    expect(html).toContain('text-foreground')
    expect(html).toContain('overflow-x-auto')
  })
})
