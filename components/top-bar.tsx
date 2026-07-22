'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, LogOut, ChevronDown, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/use-theme'
import type { Language, Level, User } from '@/lib/types'
import { LANGUAGES } from '@/lib/types'

interface TopBarProps {
  user: User
  language: Language
  level: Level
  onSwitchLanguage: () => void
  onSignOut: () => void
  disabled?: boolean
}

function UserAvatar({ user }: { user: User }) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="size-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary select-none overflow-hidden ring-2 ring-primary/20"
      aria-hidden="true"
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt="" className="size-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

export function TopBar({ user, language, level, onSwitchLanguage, onSignOut, disabled }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, toggle: toggleTheme } = useTheme()

  const langMeta = LANGUAGES.find((l) => l.value === language)
  const levelLabel = level.charAt(0).toUpperCase() + level.slice(1)

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [menuOpen])

  return (
    <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-20">
      {/* Left: logo + session badge */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo mark */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
            <svg
              viewBox="0 0 32 32"
              className="size-4 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 10h10M6 16h7" strokeLinecap="round" />
              <path
                d="M20 8c4.418 0 8 3.134 8 7s-3.582 7-8 7a8.65 8.65 0 01-2.5-.366L13 24v-4.366C21 19.634 28 15.866 28 10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-bold text-sm text-foreground hidden sm:block">LinguaAI</span>
        </div>

        <span className="text-border/60 hidden sm:block" aria-hidden="true">|</span>

        {/* Current session pill */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 min-w-0"
          aria-label={`Currently studying ${langMeta?.label}, ${levelLabel} level`}
        >
          <span className="text-sm leading-none shrink-0" role="img" aria-label={`${langMeta?.label} flag`}>
            {langMeta?.flag}
          </span>
          <span className="text-sm font-semibold text-foreground truncate">{langMeta?.nativeLabel}</span>
          <span className="text-muted-foreground/60 text-sm shrink-0" aria-hidden="true">·</span>
          <span className="text-xs text-muted-foreground shrink-0">{levelLabel}</span>
        </div>
      </div>

      {/* Right: switch language + user menu */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="hidden sm:flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="size-4" aria-hidden="true" />
          ) : (
            <Moon className="size-4" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={onSwitchLanguage}
          disabled={disabled}
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Switch language or level"
        >
          <Globe className="size-3.5" aria-hidden="true" />
          Switch
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <UserAvatar user={user} />
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform duration-200',
                menuOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-popover shadow-lg py-1 z-30 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
            >
              {/* User info */}
              <div className="px-3 py-2.5 border-b border-border mb-1">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Sign out */}
              <button
                role="menuitem"
                type="button"
                onClick={() => { setMenuOpen(false); onSignOut() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <LogOut className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
