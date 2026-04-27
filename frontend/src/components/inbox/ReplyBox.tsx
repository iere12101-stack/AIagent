'use client'

import { useState } from 'react'
import { Loader2, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReplyBoxProps {
  value?: string
  pending?: boolean
  placeholder?: string
  onSend?: (message: string) => void
  onChange?: (message: string) => void
}

export function ReplyBox({
  value,
  pending = false,
  placeholder = 'Type a reply...',
  onSend,
  onChange,
}: ReplyBoxProps) {
  const [internalValue, setInternalValue] = useState('')
  const currentValue = value ?? internalValue

  const handleChange = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue)
    }
    onChange?.(nextValue)
  }

  const handleSend = () => {
    const message = currentValue.trim()
    if (!message) {
      return
    }

    onSend?.(message)
    if (value === undefined) {
      setInternalValue('')
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2">
        <textarea
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSend()
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="min-h-[44px] flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500"
        />
        <Button
          type="button"
          size="icon"
          className="h-11 w-11 rounded-xl bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSend}
          disabled={pending || currentValue.trim().length === 0}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export default ReplyBox
