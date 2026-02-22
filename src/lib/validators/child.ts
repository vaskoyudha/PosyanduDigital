/**
 * Child form validation using Zod schemas.
 */
import { z } from 'zod'
import { validateNIK } from './nik'

export interface ValidationResult {
  success: boolean
  errors: Record<string, string>
}

export const childFormSchema = z.object({
  nama: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(255, 'Nama maksimal 255 karakter'),
  jenis_kelamin: z.enum(['L', 'P'], { error: 'Pilih jenis kelamin' }),
  tanggal_lahir: z
    .string()
    .min(1, 'Tanggal lahir wajib diisi')
    .refine((val) => {
      const date = new Date(val)
      return !isNaN(date.getTime()) && date <= new Date()
    }, 'Tanggal lahir tidak valid'),
  nik: z
    .string()
    .optional()
    .refine((val) => !val || validateNIK(val), 'NIK harus 16 digit angka'),
  no_kk: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{16}$/.test(val), 'No. KK harus 16 digit angka'),
  nama_ibu: z.string().min(2, 'Nama ibu minimal 2 karakter').max(255),
  nama_ayah: z.string().max(255).optional(),
  alamat: z.string().max(500).optional(),
  rt: z.string().max(10).optional(),
  rw: z.string().max(10).optional(),
  berat_lahir_kg: z
    .number()
    .min(0.3, 'Berat lahir minimal 0.3 kg')
    .max(10, 'Berat lahir maksimal 10 kg')
    .optional()
    .nullable(),
  panjang_lahir_cm: z
    .number()
    .min(20, 'Panjang lahir minimal 20 cm')
    .max(70, 'Panjang lahir maksimal 70 cm')
    .optional()
    .nullable(),
  consent_given: z.boolean().refine((val) => val === true, {
    message: 'Persetujuan UU PDP wajib diberikan',
  }),
  consent_guardian_name: z.string().min(2, 'Nama wali minimal 2 karakter').max(255),
  consent_guardian_relationship: z.string().max(50).optional(),
})

export type ChildFormData = z.infer<typeof childFormSchema>

export function validateChildForm(data: Partial<ChildFormData>): ValidationResult {
  const result = childFormSchema.safeParse(data)
  if (result.success) {
    return { success: true, errors: {} }
  }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    errors[path] = issue.message
  }
  return { success: false, errors }
}

export const measurementFormSchema = z.object({
  child_id: z.string().uuid('ID anak tidak valid'),
  tanggal_pengukuran: z.string().min(1, 'Tanggal pengukuran wajib diisi'),
  berat_badan_kg: z
    .number({ error: 'Berat badan wajib diisi' })
    .min(0.5, 'Berat badan minimal 0.5 kg')
    .max(30, 'Berat badan maksimal 30 kg'),
  tinggi_badan_cm: z
    .number()
    .min(30, 'Tinggi/panjang badan minimal 30 cm')
    .max(130, 'Tinggi/panjang badan maksimal 130 cm')
    .optional()
    .nullable(),
  tipe_pengukuran_tb: z.enum(['PB', 'TB']).default('PB'),
  lingkar_kepala_cm: z
    .number()
    .min(20, 'Lingkar kepala minimal 20 cm')
    .max(60, 'Lingkar kepala maksimal 60 cm')
    .optional()
    .nullable(),
  lila_cm: z
    .number()
    .min(5, 'LILA minimal 5 cm')
    .max(30, 'LILA maksimal 30 cm')
    .optional()
    .nullable(),
  has_edema: z.boolean().default(false),
})

export type MeasurementFormData = z.infer<typeof measurementFormSchema>
