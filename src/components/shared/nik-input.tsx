'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { validateNIK, stripNIK } from '@/lib/validators/nik'

export interface NIKInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  showError?: boolean
}

/**
 * NIK input component with 16-digit validation.
 * - Accepts only digits
 * - Displays with dash separators: XXXX-XXXX-XXXX-XXXX
 * - Shows red border on blur if invalid
 */
export function NIKInput({
  value,
  onChange,
  showError,
  className,
  ...props
}: NIKInputProps) {
  const [displayValue, setDisplayValue] = React.useState('')
  const [touched, setTouched] = React.useState(false)

  // Sync external value to display
  React.useEffect(() => {
    const digits = stripNIK(value)
    setDisplayValue(formatDisplay(digits))
  }, [value])

  function formatDisplay(digits: string): string {
    // Insert dashes every 4 digits
    const d = digits.slice(0, 16)
    const parts = [d.slice(0, 4), d.slice(4, 8), d.slice(8, 12), d.slice(12, 16)].filter(Boolean)
    return parts.join('-')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    // Strip all non-digits
    const digits = stripNIK(raw).slice(0, 16)
    setDisplayValue(formatDisplay(digits))
    onChange(digits)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Allow: digits, backspace, delete, tab, arrows
    const allowed = /^[0-9]$/.test(e.key)
    const control = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
    if (!allowed && !control && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
    }
  }

  const isInvalid = touched && value.length > 0 && !validateNIK(value)

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={(e) => {
        setTouched(true)
        props.onBlur?.(e)
      }}
      inputMode="numeric"
      maxLength={19} // 16 digits + 3 dashes
      placeholder="1234-5678-9012-3456"
      className={cn(
        className,
        (isInvalid || showError) && 'border-destructive focus-visible:ring-destructive/20'
      )}
      aria-invalid={isInvalid || showError}
    />
  )
}
