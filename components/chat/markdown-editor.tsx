'use client'

import MDEditor, { commands } from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'

interface MarkdownEditorProps {
  value: string
  disabled: boolean
  placeholder: string
  onChange: (value?: string) => void
}

export default function MarkdownEditor({ value, disabled, placeholder, onChange }: MarkdownEditorProps) {
  return (
    <MDEditor
      value={value}
      onChange={disabled ? undefined : onChange}
      preview="edit"
      height={128}
      aria-label="Message input"
      textareaProps={{ placeholder, disabled }}
      commands={[
        commands.bold, commands.italic, commands.strikethrough, commands.quote,
        commands.divider, commands.orderedListCommand, commands.unorderedListCommand,
      ]}
    />
  )
}
