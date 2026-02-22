/**
 * Unit tests for Export — e-PPGBM Template and Excel Generation
 *
 * Pure functions — no Supabase mocking needed.
 */
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  dataDasarToRow,
  pemantauanToRow,
  EPPGBM_DATA_DASAR_HEADERS,
  EPPGBM_PEMANTAUAN_HEADERS,
  type EppgbmDataDasar,
  type EppgbmPemantauan,
} from '../eppgbm-template'
import { generateEppgbmExcel } from '../generate-excel'

// ===========================================================================
// eppgbm-template
// ===========================================================================
describe('eppgbm-template', () => {
  const sampleDataDasar: EppgbmDataDasar = {
    no_kk: '3201012345678901',
    nik_anak: '3201012345678902',
    nama_anak: 'Siti Aminah',
    tanggal_lahir: '15/03/2023',
    jenis_kelamin: 'P',
    anak_ke: 2,
    berat_lahir: 3.1,
    panjang_lahir: 48.5,
    nik_ibu: '3201012345678903',
    nik_ayah: '3201012345678904',
    nama_ibu: 'Fatimah',
    alamat: 'Jl. Merdeka No. 10, RT 01/RW 02',
    posyandu_id: 'pos-001',
    puskesmas_id: 'pusk-001',
  }

  const samplePemantauan: EppgbmPemantauan = {
    nik_anak: '3201012345678902',
    nama_anak: 'Siti Aminah',
    bulan: '2026-01',
    tanggal_penimbangan: '10/01/2026',
    berat_badan: 10.5,
    tinggi_badan: 78.2,
    lingkar_kepala: 45.0,
    lila: 13.5,
    status_bb_u: 'normal',
    status_tb_u: 'normal',
    status_bb_tb: 'normal',
  }

  describe('EPPGBM_DATA_DASAR_HEADERS', () => {
    it('has 14 columns (matching EppgbmDataDasar fields)', () => {
      expect(EPPGBM_DATA_DASAR_HEADERS).toHaveLength(14)
    })

    it('starts with No. KK and ends with ID Puskesmas', () => {
      expect(EPPGBM_DATA_DASAR_HEADERS[0]).toBe('No. KK')
      expect(EPPGBM_DATA_DASAR_HEADERS[13]).toBe('ID Puskesmas')
    })
  })

  describe('EPPGBM_PEMANTAUAN_HEADERS', () => {
    it('has 11 columns (matching EppgbmPemantauan fields)', () => {
      expect(EPPGBM_PEMANTAUAN_HEADERS).toHaveLength(11)
    })

    it('starts with NIK Anak and ends with Status BB/TB', () => {
      expect(EPPGBM_PEMANTAUAN_HEADERS[0]).toBe('NIK Anak')
      expect(EPPGBM_PEMANTAUAN_HEADERS[10]).toBe('Status BB/TB')
    })
  })

  describe('dataDasarToRow', () => {
    it('maps all fields correctly in header order', () => {
      const row = dataDasarToRow(sampleDataDasar)

      expect(row).toHaveLength(14)
      expect(row[0]).toBe('3201012345678901')  // no_kk
      expect(row[1]).toBe('3201012345678902')  // nik_anak
      expect(row[2]).toBe('Siti Aminah')        // nama_anak
      expect(row[3]).toBe('15/03/2023')          // tanggal_lahir (DD/MM/YYYY)
      expect(row[4]).toBe('P')                   // jenis_kelamin
      expect(row[5]).toBe(2)                     // anak_ke
      expect(row[6]).toBe(3.1)                   // berat_lahir
      expect(row[7]).toBe(48.5)                  // panjang_lahir
      expect(row[8]).toBe('3201012345678903')  // nik_ibu
      expect(row[9]).toBe('3201012345678904')  // nik_ayah
      expect(row[10]).toBe('Fatimah')            // nama_ibu
      expect(row[11]).toBe('Jl. Merdeka No. 10, RT 01/RW 02') // alamat
      expect(row[12]).toBe('pos-001')            // posyandu_id
      expect(row[13]).toBe('pusk-001')           // puskesmas_id
    })

    it('date formatted as DD/MM/YYYY in dataDasarToRow', () => {
      const row = dataDasarToRow(sampleDataDasar)
      expect(row[3]).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    })

    it('null NIK is preserved as null (not empty string)', () => {
      const withNull: EppgbmDataDasar = { ...sampleDataDasar, nik_anak: null }
      const row = dataDasarToRow(withNull)
      expect(row[1]).toBeNull()
    })

    it('null optional fields preserved as null', () => {
      const minimal: EppgbmDataDasar = {
        ...sampleDataDasar,
        no_kk: null,
        nik_anak: null,
        anak_ke: null,
        berat_lahir: null,
        panjang_lahir: null,
        nik_ibu: null,
        nik_ayah: null,
        nama_ibu: null,
        alamat: null,
        puskesmas_id: null,
      }
      const row = dataDasarToRow(minimal)
      expect(row[0]).toBeNull()   // no_kk
      expect(row[1]).toBeNull()   // nik_anak
      expect(row[5]).toBeNull()   // anak_ke
      expect(row[6]).toBeNull()   // berat_lahir
      expect(row[13]).toBeNull()  // puskesmas_id
    })
  })

  describe('pemantauanToRow', () => {
    it('maps all fields correctly in header order', () => {
      const row = pemantauanToRow(samplePemantauan)

      expect(row).toHaveLength(11)
      expect(row[0]).toBe('3201012345678902') // nik_anak
      expect(row[1]).toBe('Siti Aminah')       // nama_anak
      expect(row[2]).toBe('2026-01')            // bulan
      expect(row[3]).toBe('10/01/2026')          // tanggal_penimbangan
      expect(row[4]).toBe(10.5)                  // berat_badan
      expect(row[5]).toBe(78.2)                  // tinggi_badan
      expect(row[6]).toBe(45.0)                  // lingkar_kepala
      expect(row[7]).toBe(13.5)                  // lila
      expect(row[8]).toBe('normal')              // status_bb_u
      expect(row[9]).toBe('normal')              // status_tb_u
      expect(row[10]).toBe('normal')             // status_bb_tb
    })

    it('handles null measurements', () => {
      const withNulls: EppgbmPemantauan = {
        ...samplePemantauan,
        berat_badan: null,
        tinggi_badan: null,
        lingkar_kepala: null,
        lila: null,
        status_bb_u: null,
        status_tb_u: null,
        status_bb_tb: null,
      }
      const row = pemantauanToRow(withNulls)
      expect(row[4]).toBeNull()
      expect(row[5]).toBeNull()
      expect(row[6]).toBeNull()
      expect(row[7]).toBeNull()
      expect(row[8]).toBeNull()
      expect(row[9]).toBeNull()
      expect(row[10]).toBeNull()
    })
  })
})

// ===========================================================================
// generateEppgbmExcel
// ===========================================================================
describe('generateEppgbmExcel', () => {
  const dataDasar: EppgbmDataDasar[] = [
    {
      no_kk: '001',
      nik_anak: '002',
      nama_anak: 'Test Child',
      tanggal_lahir: '01/01/2024',
      jenis_kelamin: 'L',
      anak_ke: 1,
      berat_lahir: 3.2,
      panjang_lahir: 50,
      nik_ibu: '003',
      nik_ayah: '004',
      nama_ibu: 'Ibu Test',
      alamat: 'Jl. Test',
      posyandu_id: 'pos-1',
      puskesmas_id: 'pusk-1',
    },
  ]

  const pemantauan: EppgbmPemantauan[] = [
    {
      nik_anak: '002',
      nama_anak: 'Test Child',
      bulan: '2026-01',
      tanggal_penimbangan: '15/01/2026',
      berat_badan: 10.2,
      tinggi_badan: 75.0,
      lingkar_kepala: 44.0,
      lila: 13.0,
      status_bb_u: 'normal',
      status_tb_u: 'normal',
      status_bb_tb: 'normal',
    },
  ]

  it('returns a Buffer', () => {
    const buf = generateEppgbmExcel(dataDasar, pemantauan, 'Posyandu Mawar', '2026-01')
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('generates workbook with 2 sheets', () => {
    const buf = generateEppgbmExcel(dataDasar, pemantauan, 'Posyandu Mawar', '2026-01')
    const wb = XLSX.read(buf, { type: 'buffer' })
    expect(wb.SheetNames).toHaveLength(2)
  })

  it('first sheet contains Data Dasar with correct header row', () => {
    const buf = generateEppgbmExcel(dataDasar, pemantauan, 'Posyandu Mawar', '2026-01')
    const wb = XLSX.read(buf, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })

    // Row 0 = headers
    expect(rows[0]).toEqual(EPPGBM_DATA_DASAR_HEADERS)
    // Row 1 = data
    expect(rows[1][2]).toBe('Test Child')
  })

  it('second sheet contains Pemantauan with correct header row', () => {
    const buf = generateEppgbmExcel(dataDasar, pemantauan, 'Posyandu Mawar', '2026-01')
    const wb = XLSX.read(buf, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[1]]
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })

    expect(rows[0]).toEqual(EPPGBM_PEMANTAUAN_HEADERS)
    expect(rows[1][1]).toBe('Test Child')
  })

  it('sheet names are truncated to 31 chars (Excel limit)', () => {
    const longName = 'Posyandu Dengan Nama Sangat Panjang Sekali'
    const buf = generateEppgbmExcel(dataDasar, pemantauan, longName, '2026-01')
    const wb = XLSX.read(buf, { type: 'buffer' })

    for (const name of wb.SheetNames) {
      expect(name.length).toBeLessThanOrEqual(31)
    }
  })

  it('handles empty data arrays', () => {
    const buf = generateEppgbmExcel([], [], 'Posyandu Kosong', '2026-01')
    const wb = XLSX.read(buf, { type: 'buffer' })
    expect(wb.SheetNames).toHaveLength(2)

    // Each sheet should have only the header row
    const ws1 = wb.Sheets[wb.SheetNames[0]]
    const rows1 = XLSX.utils.sheet_to_json<string[]>(ws1, { header: 1 })
    expect(rows1).toHaveLength(1) // headers only
  })
})
