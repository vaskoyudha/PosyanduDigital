'use client'

import * as React from 'react'
import { Shield, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ConsentData {
  consent_given: true
  consent_date: string
  consent_guardian_name: string
  consent_guardian_relationship: string
}

export interface ConsentFormProps {
  onConsent: (data: ConsentData) => void
  onBack: () => void
}

export function ConsentForm({ onConsent, onBack }: Readonly<ConsentFormProps>) {
  const [check1, setCheck1] = React.useState(false)
  const [check2, setCheck2] = React.useState(false)
  const [check3, setCheck3] = React.useState(false)
  const [guardianName, setGuardianName] = React.useState('')
  const [relationship, setRelationship] = React.useState('')

  const allChecked = check1 && check2 && check3
  const nameValid = guardianName.trim().length >= 2
  const relationshipValid = relationship.length > 0
  const canSubmit = allChecked && nameValid && relationshipValid

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const toTitleCase = (s: string) =>
      s.trim().replace(/\b\w/g, (c) => c.toUpperCase())

    onConsent({
      consent_given: true,
      consent_date: new Date().toISOString().split('T')[0],
      consent_guardian_name: toTitleCase(guardianName),
      consent_guardian_relationship: relationship,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">Persetujuan Penggunaan Data</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sesuai Undang-Undang Perlindungan Data Pribadi (UU PDP) No. 27 Tahun 2022
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Checkbox 1: Data identitas */}
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <input
              type="checkbox"
              id="consent_identity"
              checked={check1}
              onChange={(e) => setCheck1(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <Label htmlFor="consent_identity" className="cursor-pointer leading-relaxed text-sm">
              Saya menyetujui penggunaan <strong>data identitas anak</strong> (nama, tanggal lahir, NIK) untuk keperluan pemantauan gizi posyandu
            </Label>
          </div>

          {/* Checkbox 2: Data pertumbuhan */}
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <input
              type="checkbox"
              id="consent_growth"
              checked={check2}
              onChange={(e) => setCheck2(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <Label htmlFor="consent_growth" className="cursor-pointer leading-relaxed text-sm">
              Saya menyetujui penggunaan <strong>data pertumbuhan</strong> (berat badan, tinggi badan) untuk analisis status gizi
            </Label>
          </div>

          {/* Checkbox 3: Data imunisasi */}
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <input
              type="checkbox"
              id="consent_immunization"
              checked={check3}
              onChange={(e) => setCheck3(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <Label htmlFor="consent_immunization" className="cursor-pointer leading-relaxed text-sm">
              Saya menyetujui penggunaan <strong>data imunisasi</strong> untuk pemantauan program imunisasi nasional
            </Label>
          </div>

          {/* Info box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Informasi Pengelolaan Data</span>
            </div>
            <ul className="space-y-1.5 text-sm text-blue-700">
              <li><strong>Tujuan:</strong> Pemantauan gizi anak balita</li>
              <li><strong>Pengelola data:</strong> Puskesmas / Dinas Kesehatan setempat</li>
              <li><strong>Lama penyimpanan:</strong> 5 tahun atau hingga anak berusia 6 tahun</li>
              <li><strong>Hak subjek data:</strong> Dapat meminta penghapusan data sesuai UU PDP</li>
            </ul>
          </div>

          {/* Guardian name */}
          <div className="space-y-2">
            <Label htmlFor="guardian_name">Nama Wali / Orang Tua *</Label>
            <Input
              id="guardian_name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Nama yang memberikan persetujuan"
              onBlur={(e) => {
                const val = e.target.value
                const titled = val.trim().replace(/\b\w/g, (c) => c.toUpperCase())
                setGuardianName(titled)
              }}
            />
            {guardianName.length > 0 && !nameValid && (
              <p className="text-sm text-destructive">Nama wali minimal 2 karakter</p>
            )}
          </div>

          {/* Guardian relationship */}
          <div className="space-y-2">
            <Label htmlFor="guardian_relationship">Hubungan dengan Anak *</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih hubungan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ayah">Ayah</SelectItem>
                <SelectItem value="ibu">Ibu</SelectItem>
                <SelectItem value="wali">Wali</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onBack}>
          Kembali
        </Button>
        <Button type="submit" disabled={!canSubmit} className="min-w-[160px]">
          Setuju &amp; Lanjutkan
        </Button>
      </div>
    </form>
  )
}
