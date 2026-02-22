'use client'

import * as React from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateIndonesian } from '@/lib/utils/date'

export interface DatePickerProps {
  value: Date | null | undefined
  onChange: (date: Date | null) => void
  placeholder?: string
  maxDate?: Date
  minDate?: Date
  disabled?: boolean
  className?: string
  id?: string
}

/**
 * Date picker component with DD/MM/YYYY Indonesian display format.
 * Uses shadcn Calendar + Popover.
 * Internal value: Date object.
 * Display: DD/MM/YYYY.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  maxDate,
  minDate,
  disabled,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const displayValue = value && isValid(value)
    ? formatDateIndonesian(value)
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !displayValue && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {displayValue ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(date) => {
            onChange(date ?? null)
            setOpen(false)
          }}
          disabled={(date) => {
            if (maxDate && date > maxDate) return true
            if (minDate && date < minDate) return true
            return false
          }}
          captionLayout="dropdown"
          fromYear={1950}
          toYear={new Date().getFullYear()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * Convert a Date to ISO date string YYYY-MM-DD.
 */
export function dateToISO(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return ''
  return format(date, 'yyyy-MM-dd')
}

/**
 * Convert ISO date string YYYY-MM-DD to Date object.
 */
export function isoToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = parseISO(iso)
  return isValid(d) ? d : null
}
