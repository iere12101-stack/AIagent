import { useEffect } from 'react'

export function useInboxShortcuts({
  onMarkRead,
  onArchive,
  onDelete,
  onNextConv,
  onPrevConv,
  onFocusSearch,
}: {
  onMarkRead: () => void
  onArchive: () => void
  onDelete: () => void
  onNextConv: () => void
  onPrevConv: () => void
  onFocusSearch: () => void
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if (event.key === 'e') {
        event.preventDefault()
        onArchive()
      }
      if (event.key === '#') {
        event.preventDefault()
        onDelete()
      }
      if (event.key === 'u') {
        event.preventDefault()
        onMarkRead()
      }
      if (event.key === 'j') {
        event.preventDefault()
        onNextConv()
      }
      if (event.key === 'k') {
        event.preventDefault()
        onPrevConv()
      }
      if (event.key === '/') {
        event.preventDefault()
        onFocusSearch()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onArchive, onDelete, onFocusSearch, onMarkRead, onNextConv, onPrevConv])
}
