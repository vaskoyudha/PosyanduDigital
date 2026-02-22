'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export interface DecimalInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined
  onChange: (value: number | null) => void
  decimals?: number
}

/**
 * Decimal input component that forces period (.) as decimal separator.
 * - Rejects comma keypress silently
 * - Accepts digits, period, and minus only
 * - On blur: formats to the specified number of decimal places
 * - Stores value as number | null internally
 */
export function DecimalInput({
  value,
  onChange,
  decimals = 2,
  className,
  placeholder,
  disabled,
  ...props
}: DecimalInputProps) {
  // Internal display string
  const [display, setDisplay] = React.useState('')

  // Sync from controlled value to display
  React.useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) {
      setDisplay('')
    } else {
      setDisplay(value.toString())
    }
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Block comma — Indonesian habit
    if (e.key === ',') {
      e.preventDefault()
      return
    }
    // Allow: digits, period, minus, control keys
    const allowed = /^[0-9.\-]$/.test(e.key)
    const control = [
      'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'Enter',
    ].includes(e.key)
    if (!allowed && !control && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value
    // Convert any comma to period (paste protection)
    raw = raw.replace(',', '.')
    // Prevent multiple periods
    const periodCount = (raw.match(/\./g) || []).length
    if (periodCount > 1) return
    setDisplay(raw)
    // Parse to number
    const num = parseFloat(raw)
    onChange(raw === '' ? null : isNaN(num) ? null : num)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Format on blur
    const num = parseFloat(display)
    if (!isNaN(num)) {
      setDisplay(num.toFixed(decimals))
    } else {
      setDisplay('')
    }
    props.onBlur?.(e)
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    const normalized = pasted.replace(',', '.')
    if (normalized !== pasted) {
      e.preventDefault()
      const cur = display
      const target = e.currentTarget
      const start = target.selectionStart ?? 0
      const end = target.selectionEnd ?? 0
      const newVal = cur.slice(0, start) + normalized + cur.slice(end)
      setDisplay(newVal)
      const num = parseFloat(newVal)
      onChange(isNaN(num) ? null : num)
    }
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPaste={handlePaste}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(className)}
    />
  )
}
