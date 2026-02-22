/**
 * e-PPGBM Template — Field definitions and column headers
 *
 * Two record types:
 * 1. Data Dasar — child registration data (one row per child)
 * 2. Pemantauan — monthly measurement data (one row per child per month)
 */

export interface EppgbmDataDasar {
  no_kk: string | null
  nik_anak: string | null
  nama_anak: string
  tanggal_lahir: string        // DD/MM/YYYY display format
  jenis_kelamin: 'L' | 'P'
  anak_ke: number | null
  berat_lahir: number | null   // kg, period decimal
  panjang_lahir: number | null // cm, period decimal
  nik_ibu: string | null
  nik_ayah: string | null
  nama_ibu: string | null
  alamat: string | null
  posyandu_id: string
  puskesmas_id: string | null
}

export interface EppgbmPemantauan {
  nik_anak: string | null
  nama_anak: string
  bulan: string                      // YYYY-MM
  tanggal_penimbangan: string | null // DD/MM/YYYY
  berat_badan: number | null         // kg, period decimal
  tinggi_badan: number | null        // cm, period decimal
  lingkar_kepala: number | null      // cm, period decimal
  lila: number | null                // cm, period decimal
  status_bb_u: string | null
  status_tb_u: string | null
  status_bb_tb: string | null
}

/** Column headers for Data Dasar sheet — exact e-PPGBM format */
export const EPPGBM_DATA_DASAR_HEADERS: string[] = [
  'No. KK',
  'NIK Anak',
  'Nama Anak',
  'Tanggal Lahir',
  'Jenis Kelamin',
  'Anak Ke',
  'Berat Lahir (kg)',
  'Panjang Lahir (cm)',
  'NIK Ibu',
  'NIK Ayah',
  'Nama Ibu',
  'Alamat',
  'ID Posyandu',
  'ID Puskesmas',
]

/** Column headers for Pemantauan sheet — exact e-PPGBM format */
export const EPPGBM_PEMANTAUAN_HEADERS: string[] = [
  'NIK Anak',
  'Nama Anak',
  'Bulan',
  'Tanggal Penimbangan',
  'Berat Badan (kg)',
  'Tinggi Badan (cm)',
  'Lingkar Kepala (cm)',
  'LILA (cm)',
  'Status BB/U',
  'Status TB/U',
  'Status BB/TB',
]

/** Map EppgbmDataDasar object to array matching EPPGBM_DATA_DASAR_HEADERS order */
export function dataDasarToRow(d: EppgbmDataDasar): (string | number | null)[] {
  return [
    d.no_kk,
    d.nik_anak,
    d.nama_anak,
    d.tanggal_lahir,
    d.jenis_kelamin,
    d.anak_ke,
    d.berat_lahir,
    d.panjang_lahir,
    d.nik_ibu,
    d.nik_ayah,
    d.nama_ibu,
    d.alamat,
    d.posyandu_id,
    d.puskesmas_id,
  ]
}

/** Map EppgbmPemantauan object to array matching EPPGBM_PEMANTAUAN_HEADERS order */
export function pemantauanToRow(p: EppgbmPemantauan): (string | number | null)[] {
  return [
    p.nik_anak,
    p.nama_anak,
    p.bulan,
    p.tanggal_penimbangan,
    p.berat_badan,
    p.tinggi_badan,
    p.lingkar_kepala,
    p.lila,
    p.status_bb_u,
    p.status_tb_u,
    p.status_bb_tb,
  ]
}
