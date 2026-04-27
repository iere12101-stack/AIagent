'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore, type AppPage } from '@/lib/store'
import { Search, Keyboard, ArrowRight, Navigation, Zap, Inbox, X } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Shortcut definitions                                                */
/* ------------------------------------------------------------------ */

interface ShortcutEntry {
  keys: string[]
  description: string
  action?: () => void
}

interface ShortcutGroup {
  title: string
  icon: typeof Navigation
  shortcuts: ShortcutEntry[]
}

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  /* -------------------------------------------------------------- */
  /*  Build shortcut groups                                           */
  /* -------------------------------------------------------------- */

  const groups: ShortcutGroup[] = [
    {
      title: 'Navigation',
      icon: Navigation,
      shortcuts: [
        { keys: ['G', 'D'], description: 'Go to Dashboard', action: () => setCurrentPage('dashboard') },
        { keys: ['G', 'I'], description: 'Go to Inbox', action: () => setCurrentPage('inbox') },
        { keys: ['G', 'C'], description: 'Go to Contacts', action: () => setCurrentPage('contacts') },
        { keys: ['G', 'P'], description: 'Go to Properties', action: () => setCurrentPage('properties') },
        { keys: ['G', 'A'], description: 'Go to Analytics', action: () => setCurrentPage('analytics') },
        { keys: ['G', 'S'], description: 'Go to Settings', action: () => setCurrentPage('settings') },
      ],
    },
    {
      title: 'Actions',
      icon: Zap,
      shortcuts: [
        { keys: ['⌘K'], description: 'Open Command Palette' },
        { keys: ['?'], description: 'Show Shortcuts' },
        { keys: ['Esc'], description: 'Close overlay / Go back' },
      ],
    },
    {
      title: 'Inbox',
      icon: Inbox,
      shortcuts: [
        { keys: ['N'], description: 'New conversation (inbox page)' },
        { keys: ['↑', '↓'], description: 'Navigate conversations' },
        { keys: ['Enter'], description: 'Open conversation' },
      ],
    },
  ]

  /* -------------------------------------------------------------- */
  /*  Filter groups by search query                                   */
  /* -------------------------------------------------------------- */

  const filteredGroups = search.trim()
    ? groups
        .map((group) => ({
          ...group,
          shortcuts: group.shortcuts.filter(
            (s) =>
              s.description.toLowerCase().includes(search.toLowerCase()) ||
              s.keys.some((k) => k.toLowerCase().includes(search.toLowerCase())) ||
              group.title.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((g) => g.shortcuts.length > 0)
    : groups

  /* -------------------------------------------------------------- */
  /*  Open / Close helpers                                            */
  /* -------------------------------------------------------------- */

  const openOverlay = useCallback(() => {
    setVisible(true)
    setOpen(true)
    setSearch('')
  }, [])

  const closeOverlay = useCallback(() => {
    setOpen(false)
    setSearch('')
  }, [])

  /* -------------------------------------------------------------- */
  /*  Global keyboard listener                                        */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        closeOverlay()
        return
      }

      // Don't open if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // Open on "?" (Shift+/)
      if (e.key === '?' && !open && !isTyping) {
        e.preventDefault()
        openOverlay()
        return
      }

      // Open on Ctrl+/ or Cmd+/
      if ((e.metaKey || e.ctrlKey) && e.key === '/' && !open) {
        e.preventDefault()
        openOverlay()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, closeOverlay, openOverlay])

  /* -------------------------------------------------------------- */
  /*  Focus search input on open + hide after close animation         */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (open) {
      // Small delay to let animation start before focusing
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(focusTimer)
    }
  }, [open])

  // Hide from DOM after close animation finishes
  useEffect(() => {
    if (!open && visible) {
      const hideTimer = setTimeout(() => {
        setVisible(false)
      }, 250)
      return () => clearTimeout(hideTimer)
    }
  }, [open, visible])

  /* -------------------------------------------------------------- */
  /*  Click outside to close                                          */
  /* -------------------------------------------------------------- */

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        closeOverlay()
      }
    },
    [closeOverlay],
  )

  /* -------------------------------------------------------------- */
  /*  Render                                                           */
  /* -------------------------------------------------------------- */

  if (!visible) return null

  const totalShortcuts = filteredGroups.reduce((acc, g) => acc + g.shortcuts.length, 0)

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[100] flex items-center justify-center page-overlay transition-opacity duration-200 ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
    >
      {/* Modal Card */}
      <div
        className={`glass-card rounded-2xl shadow-card-lg w-full max-w-lg mx-4 overflow-hidden animate-scale-in ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ transition: 'scale 0.2s ease, opacity 0.2s ease' }}
      >
        {/* Emerald Header Strip */}
        <div className="relative bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(0.7_0.17_163/0.3),transparent_70%)]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm">
                <Keyboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                <p className="text-emerald-100 text-xs mt-0.5">
                  {totalShortcuts} shortcuts available
                </p>
              </div>
            </div>
            <button
              onClick={closeOverlay}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative input-glow rounded-lg border">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Filter shortcuts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 bg-transparent pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="px-4 pb-4 max-h-[420px] overflow-y-auto scroll-smooth">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No shortcuts match &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <div className="stagger-children space-y-4 mt-1">
              {filteredGroups.map((group) => (
                <div key={group.title}>
                  {/* Group Header */}
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <group.icon className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.title}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Shortcuts */}
                  <div className="space-y-1">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-default group"
                      >
                        {/* Keyboard Badges */}
                        <div className="flex items-center gap-1.5">
                          {shortcut.keys.map((key, i) => (
                            <span key={`${key}-${i}`} className="flex items-center gap-1.5">
                              <kbd
                                className="inline-flex items-center justify-center rounded-md px-2 py-1 font-mono text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm min-w-[28px] text-center"
                              >
                                {key}
                              </kbd>
                              {i < shortcut.keys.length - 1 && (
                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                              )}
                            </span>
                          ))}
                        </div>

                        {/* Description */}
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors text-right ml-4">
                          {shortcut.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded px-1.5 py-0.5 bg-background border text-[10px] font-mono shadow-sm">Esc</kbd>
              to close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded px-1.5 py-0.5 bg-background border text-[10px] font-mono shadow-sm">/</kbd>
              to search
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            IERE WhatsApp AI
          </span>
        </div>
      </div>
    </div>
  )
}
