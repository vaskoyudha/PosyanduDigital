'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import { childFormSchema, type ChildFormData } from '@/lib/validators/child'
import { useUser } from '@/lib/hooks/use-user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { NIKInput } from '@/components/shared/nik-input'
import { DecimalInput } from '@/components/shared/decimal-input'
import { DatePicker, dateToISO } from '@/components/shared/date-picker'
import { MatchDialog, type MatchEntry } from '@/components/children/match-dialog'
import { ConsentForm, type ConsentData } from '@/components/consent/consent-form'

export interface ChildFormProps {
  posyanduId?: string
  onSuccess?: (childId: string) => void
}

/**
 * Two-step child registration form.
 * Step 1: Child data (existing form fields)
 * Step 2: UU PDP consent form
 */
export function ChildForm({ posyanduId, onSuccess }: ChildFormProps) {
  const router = useRouter()
  const { posyandu_id } = useUser()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [step, setStep] = React.useState<'form' | 'consent'>('form')

  // Match detection state
  const [matchDialogOpen, setMatchDialogOpen] = React.useState(false)
  const [matchResults, setMatchResults] = React.useState<MatchEntry[]>([])
  const matchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const effectivePosyanduId = posyanduId ?? posyandu_id

  const form = useForm<ChildFormData>({
    resolver: zodResolver(childFormSchema),
    defaultValues: {
      nama: '',
      jenis_kelamin: 'L',
      tanggal_lahir: '',
      nik: '',
      no_kk: '',
      nama_ibu: '',
      nama_ayah: '',
      alamat: '',
      rt: '',
      rw: '',
      berat_lahir_kg: null,
      panjang_lahir_cm: null,
      consent_given: false,
      consent_guardian_name: '',
      consent_guardian_relationship: '',
    },
  })

  /**
   * Debounced duplicate check: fires 500ms after any key matching field changes.
   * Requires nama + tanggal_lahir to have values before triggering.
   */
  const triggerMatchCheck = React.useCallback(() => {
    if (matchTimerRef.current) {
      clearTimeout(matchTimerRef.current)
    }

    matchTimerRef.current = setTimeout(async () => {
      const nama = form.getValues('nama')?.trim()
      const tanggal_lahir = form.getValues('tanggal_lahir')
      const nama_ibu = form.getValues('nama_ibu')?.trim()
      const nik = form.getValues('nik')?.trim()

      if (!nama || !tanggal_lahir || !effectivePosyanduId) return

      try {
        const response = await fetch('/api/children/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama,
            tanggal_lahir,
            nama_ibu: nama_ibu || undefined,
            nik: nik || undefined,
            posyandu_id: effectivePosyanduId,
          }),
        })

        if (!response.ok) return

        const result = await response.json() as { matches: MatchEntry[] }

        if (result.matches && result.matches.length > 0) {
          setMatchResults(result.matches)
          setMatchDialogOpen(true)
        }
      } catch {
        // Silently fail — match check is non-critical
      }
    }, 500)
  }, [form, effectivePosyanduId])

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (matchTimerRef.current) {
        clearTimeout(matchTimerRef.current)
      }
    }
  }, [])

  function handleUseExisting(childId: string) {
    setMatchDialogOpen(false)
    router.push(`/children/${childId}`)
  }

  function handleCreateNew() {
    setMatchDialogOpen(false)
  }

  /**
   * Step 1 → Step 2: validate data fields (except consent), then proceed to consent step.
   */
  async function handleProceedToConsent() {
    // Temporarily set consent fields to valid values for partial validation
    form.setValue('consent_given', true)
    form.setValue('consent_guardian_name', 'temp')

    const valid = await form.trigger()

    // Reset consent fields back
    form.setValue('consent_given', false)
    form.setValue('consent_guardian_name', '')

    if (valid) {
      setStep('consent')
      setServerError(null)
    }
  }

  /**
   * Step 2: consent accepted → merge consent data and submit.
   */
  async function handleConsentAccepted(consentData: ConsentData) {
    form.setValue('consent_given', consentData.consent_given)
    form.setValue('consent_guardian_name', consentData.consent_guardian_name)
    form.setValue('consent_guardian_relationship', consentData.consent_guardian_relationship)

    const values = form.getValues()
    await doSubmit(values, consentData.consent_date)
  }

  async function doSubmit(values: ChildFormData, consentDate: string) {
    setIsSubmitting(true)
    setServerError(null)

    try {
      const payload = {
        ...values,
        posyandu_id: effectivePosyanduId,
        consent_date: consentDate,
      }

      const response = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json() as { data?: { id: string }; error?: string }

      if (!response.ok) {
        setServerError(result.error ?? 'Terjadi kesalahan saat menyimpan data')
        return
      }

      if (result.data?.id) {
        if (onSuccess) {
          onSuccess(result.data.id)
        } else {
          router.push(`/children/${result.data.id}`)
        }
      }
    } catch {
      setServerError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step indicator
  const stepIndicator = (
    <div className="flex items-center gap-2 mb-6">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
          step === 'form'
            ? 'bg-green-600 text-white'
            : 'bg-green-100 text-green-700'
        }`}
      >
        1
      </div>
      <div className="h-0.5 w-8 bg-gray-200" />
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
          step === 'consent'
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        2
      </div>
      <span className="ml-2 text-sm text-muted-foreground">
        {step === 'form' ? 'Data Anak' : 'Persetujuan UU PDP'}
      </span>
    </div>
  )

  // ── Step 2: Consent ──
  if (step === 'consent') {
    return (
      <div>
        {stepIndicator}

        {serverError && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {isSubmitting ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            <span className="ml-2 text-sm text-muted-foreground">Menyimpan data...</span>
          </div>
        ) : (
          <ConsentForm
            onConsent={handleConsentAccepted}
            onBack={() => setStep('form')}
          />
        )}
      </div>
    )
  }

  // ── Step 1: Data Anak ──
  return (
    <div>
      {stepIndicator}

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleProceedToConsent()
          }}
          className="space-y-6"
        >
          {/* Data Anak */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Anak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nama */}
              <FormField
                control={form.control}
                name="nama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nama lengkap anak"
                        onBlur={(e) => {
                          const val = e.target.value
                          const titled = val.trim().replace(/\b\w/g, (c) => c.toUpperCase())
                          field.onChange(titled)
                          field.onBlur()
                          triggerMatchCheck()
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Jenis Kelamin & Tanggal Lahir */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="jenis_kelamin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Kelamin *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis kelamin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="L">Laki-laki</SelectItem>
                          <SelectItem value="P">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tanggal_lahir"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Lahir *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? new Date(field.value + 'T00:00:00') : null}
                          onChange={(date) => {
                            field.onChange(dateToISO(date))
                            triggerMatchCheck()
                          }}
                          maxDate={new Date()}
                          placeholder="Pilih tanggal lahir"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* NIK & No. KK */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIK (Opsional)</FormLabel>
                      <FormControl>
                        <NIKInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="no_kk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. Kartu Keluarga (Opsional)</FormLabel>
                      <FormControl>
                        <NIKInput
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          placeholder="Nomor KK (16 digit)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Berat & Panjang Lahir */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="berat_lahir_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Berat Lahir (kg)</FormLabel>
                      <FormControl>
                        <DecimalInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="cth: 3.20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="panjang_lahir_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Panjang Lahir (cm)</FormLabel>
                      <FormControl>
                        <DecimalInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="cth: 50.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Orang Tua */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Orang Tua / Wali</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nama_ibu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Ibu *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nama lengkap ibu"
                          onBlur={(e) => {
                            const val = e.target.value
                            const titled = val.trim().replace(/\b\w/g, (c) => c.toUpperCase())
                            field.onChange(titled)
                            field.onBlur()
                            triggerMatchCheck()
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nama_ayah"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Ayah (Opsional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nama lengkap ayah"
                          onBlur={(e) => {
                            const val = e.target.value
                            const titled = val.trim().replace(/\b\w/g, (c) => c.toUpperCase())
                            field.onChange(titled)
                            field.onBlur()
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Alamat */}
              <FormField
                control={form.control}
                name="alamat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Alamat lengkap"
                        rows={2}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* RT / RW */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RT</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="001" maxLength={10} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RW</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="001" maxLength={10} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
            >
              Batal
            </Button>
            <Button type="submit" className="min-w-[180px]">
              <span>Lanjut ke Persetujuan</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        <MatchDialog
          open={matchDialogOpen}
          onOpenChange={setMatchDialogOpen}
          matches={matchResults}
          onUseExisting={handleUseExisting}
          onCreateNew={handleCreateNew}
        />
      </Form>
    </div>
  )
}
