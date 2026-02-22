'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export interface SearchInputProps extends Omit<React.ComponentProps<'input'>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
  placeholder?: string
  className?: string
}

/**
 * Debounced search input component.
 * - Debounces onChange by 300ms (configurable)
 * - Shows search icon inside the input
 */
export function SearchInput({
  value,
  onChange,
  debounceMs = 300,
  placeholder = 'Cari...',
  className,
  ...props
}: SearchInputProps) {
  const [localValue, setLocalValue] = React.useState(value)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value changes
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    setLocalValue(newValue)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(newValue)
    }, debounceMs)
  }

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        {...props}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  )
}
