import React from 'react'

/**
 * Shared prose-style markdown component overrides used by both ChatBubble
 * and ExercisePanel. Avoids duplicating these across files.
 */
export const markdownComponents: Record<string, React.ComponentType<any>> = {
  p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-1.5 last:mb-0 leading-relaxed" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc pl-4 mb-1.5 last:mb-0 space-y-0.5" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal pl-4 mb-1.5 last:mb-0 space-y-0.5" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) => (
    <li className="leading-relaxed" {...props}>{children}</li>
  ),
  code: ({ children, className, ...props }: React.ComponentPropsWithoutRef<'code'>) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="px-1 py-0.5 rounded text-[0.85em] bg-black/10 font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className={`block px-3 py-2 rounded-lg text-[0.85em] bg-black/10 font-mono overflow-x-auto mb-1.5 ${className || ''}`} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: React.ComponentPropsWithoutRef<'pre'>) => (
    <pre className="mb-1.5 last:mb-0 overflow-x-auto" {...props}>{children}</pre>
  ),
  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold" {...props}>{children}</strong>
  ),
  h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-base font-bold mb-1.5" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-sm font-bold mb-1.5" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-sm font-semibold mb-1" {...props}>{children}</h3>
  ),
  blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-2 border-current/30 pl-3 italic opacity-80 mb-1.5 last:mb-0" {...props}>{children}</blockquote>
  ),
  a: ({ children, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
    <a className="underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto mb-2 last:mb-0">
      <table className="w-full text-xs border-collapse border border-border rounded-lg" {...props}>{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: React.ComponentPropsWithoutRef<'thead'>) => (
    <thead className="bg-muted/60" {...props}>{children}</thead>
  ),
  tbody: ({ children, ...props }: React.ComponentPropsWithoutRef<'tbody'>) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }: React.ComponentPropsWithoutRef<'tr'>) => (
    <tr className="border-b border-border last:border-b-0" {...props}>{children}</tr>
  ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) => (
    <th className="px-3 py-2 text-left font-semibold text-foreground border-r border-border last:border-r-0" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) => (
    <td className="px-3 py-2 text-left text-foreground/90 border-r border-border last:border-r-0" {...props}>{children}</td>
  ),
}