'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { measurementFormSchema } from '@/lib/validators/child'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// Use input type (before Zod defaults are applied) to satisfy useForm generics
type MeasurementFormInput = z.input<typeof measurementFormSchema>
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DecimalInput } from '@/components/shared/decimal-input'
import { DatePicker, dateToISO } from '@/components/shared/date-picker'

export interface MeasurementFormProps {
  childId: string
  tanggalLahir: string
  onSuccess?: (measurementId: string) => void
}

/**
 * Measurement entry form for a specific child.
 * Submits to POST /api/measurements.
 * Server calculates Z-scores and N/T/BGM/2T.
 */
export function MeasurementForm({ childId, tanggalLahir, onSuccess }: MeasurementFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const keteranganRef = React.useRef<HTMLTextAreaElement>(null)

  const form = useForm<MeasurementFormInput>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      child_id: childId,
      tanggal_pengukuran: new Date().toISOString().split('T')[0],
      berat_badan_kg: undefined,
      tinggi_badan_cm: null,
      tipe_pengukuran_tb: 'PB',
      lingkar_kepala_cm: null,
      lila_cm: null,
      has_edema: false,
    },
  })

  async function onSubmit(values: MeasurementFormInput) {
    setIsSubmitting(true)
    setServerError(null)

    try {
      const response = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          keterangan: keteranganRef.current?.value || undefined,
        }),
      })

      const result = await response.json() as { data?: { id: string }; error?: string }

      if (!response.ok) {
        setServerError(result.error ?? 'Terjadi kesalahan saat menyimpan pengukuran')
        return
      }

      if (result.data?.id) {
        if (onSuccess) {
          onSuccess(result.data.id)
        } else {
          router.push(`/children/${childId}`)
          router.refresh()
        }
      }
    } catch {
      setServerError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Tanggal Pengukuran */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tanggal Pengukuran</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="tanggal_pengukuran"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Pengukuran *</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value ? new Date(field.value + 'T00:00:00') : null}
                      onChange={(date) => field.onChange(dateToISO(date))}
                      maxDate={new Date()}
                      minDate={tanggalLahir ? new Date(tanggalLahir + 'T00:00:00') : undefined}
                      placeholder="Pilih tanggal pengukuran"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Antropometri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Antropometri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Berat Badan */}
            <FormField
              control={form.control}
              name="berat_badan_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Berat Badan (kg) *</FormLabel>
                  <FormControl>
                    <DecimalInput
                      value={field.value ?? null}
                      onChange={field.onChange}
                      placeholder="cth: 8.50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tinggi/Panjang Badan */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tinggi_badan_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tinggi/Panjang Badan (cm)</FormLabel>
                    <FormControl>
                      <DecimalInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="cth: 72.50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipe_pengukuran_tb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cara Pengukuran TB</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih cara ukur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PB">PB (Panjang Badan / Terlentang)</SelectItem>
                        <SelectItem value="TB">TB (Tinggi Badan / Berdiri)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* LK & LILA */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lingkar_kepala_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lingkar Kepala (cm)</FormLabel>
                    <FormControl>
                      <DecimalInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="cth: 44.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lila_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LILA (cm)</FormLabel>
                    <FormControl>
                      <DecimalInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="cth: 13.50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Kondisi Klinis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kondisi Klinis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="has_edema"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <input
                      type="checkbox"
                      id="has_edema"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                    />
                    <label htmlFor="has_edema" className="cursor-pointer text-sm leading-relaxed">
                      Anak mengalami <strong>edema bilateral</strong> (bengkak pada kedua kaki)
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Keterangan */}
            <div className="space-y-2">
              <label htmlFor="keterangan" className="text-sm font-medium leading-none">
                Keterangan (Opsional)
              </label>
              <Textarea
                id="keterangan"
                ref={keteranganRef}
                placeholder="Catatan tambahan pengukuran..."
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {serverError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Pengukuran'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
