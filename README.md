# PosyanduDigital

> **Sistem Informasi Posyandu Digital** — Platform web end-to-end yang mendigitalisasi pencatatan posyandu berbasis kertas melalui OCR dan mengubahnya menjadi dasbor analitik gizi yang dapat ditindaklanjuti.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-3ECF8E?logo=supabase)](https://supabase.com)
[![Tests](https://img.shields.io/badge/Tests-170%20passing-brightgreen)](#testing)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)


---

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Tech Stack](#tech-stack)
- [Prasyarat](#prasyarat)
- [Instalasi & Setup Lokal](#instalasi--setup-lokal)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Struktur Proyek](#struktur-proyek)
- [Peran Pengguna](#peran-pengguna)
- [Pipeline OCR](#pipeline-ocr)
- [Testing](#testing)
- [Deploy ke Production](#deploy-ke-production)
- [Kontribusi](#kontribusi)

---

## Tentang Proyek

PosyanduDigital mengatasi masalah utama posyandu di Indonesia: pencatatan manual menggunakan **Kartu Menuju Sehat (KMS)** yang rentan kesalahan, sulit dianalisis, dan tidak dapat diakses secara real-time oleh pengambil kebijakan.

Platform ini memungkinkan:
- **Kader posyandu** mengunggah foto KMS dan mendapat hasil OCR otomatis
- **Bidan & TPG** mengulas dan memverifikasi data hasil OCR
- **Kepala Puskesmas & Dinas Kesehatan** memantau status gizi anak secara agregat

Kalkulasi Z-score mengikuti standar WHO (weight-for-age, height-for-age, weight-for-height) sesuai PMK Nomor 2 Tahun 2020.

---

## Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🔍 **OCR Otomatis** | Upload foto KMS → ekstraksi data otomatis via Google Gemini 2.5 Flash + PaddleOCR |
| 📊 **Z-Score WHO** | Kalkulasi WAZ, HAZ, WHZ otomatis sesuai tabel WHO 2006 |
| 📈 **Growth Chart** | Grafik pertumbuhan anak interaktif dengan garis referensi WHO |
| 👥 **Multi-Peran** | 5 persona: Kader, Bidan, TPG, Kepala Puskesmas, Dinas Kesehatan |
| 🔄 **Review Interface** | Split-view dokumen asli vs data OCR untuk koreksi manual |
| 📋 **Ekspor e-PPGBM** | Generate laporan Excel format e-PPGBM & PDF siap cetak |
| 🔒 **UU PDP Compliant** | Audit log, consent management, masking data sesuai UU No. 27/2022 |
| ⚡ **Real-time Progress** | Progress OCR via Supabase Realtime (postgres_changes) |

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React/Next.js)                  │
│  Login → Dashboard → Upload → Review → Export → Admin       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│              Next.js App Router (Vercel)                     │
│  API Routes: /api/children, /api/upload, /api/review, ...   │
└────────────┬─────────────────────────────┬──────────────────┘
             │ Supabase Client             │ HTTP POST
             │                            ▼
┌────────────▼──────────────┐  ┌─────────────────────────────┐
│   Supabase (PostgreSQL)   │  │   Python OCR Worker         │
│   - Row Level Security    │  │   (FastAPI on Railway)      │
│   - Supabase Auth         │  │   - Preprocessing (OpenCV)  │
│   - Storage Buckets       │  │   - Table Detection         │
│   - Realtime CDC          │  │   - Cell Extraction         │
│   - Audit Logs            │  │   - Text Recognition        │
└───────────────────────────┘  │     (Gemini 2.5 Flash)      │
                               └─────────────────────────────┘
```

**Keputusan arsitektur utama:**
- **No BullMQ** — Worker Python tidak bisa consume BullMQ natively → diganti FastAPI HTTP service di Railway
- **No SSE** — Risiko timeout Vercel serverless → diganti Supabase Realtime + polling fallback setiap 3 detik
- **Online-only** (v1) — Tidak ada PWA/offline support

---

## Tech Stack

### Frontend & Backend (Monorepo)

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5.x |
| UI Components | shadcn/ui + Radix UI + Tailwind CSS v4 |
| Charts | Recharts |
| Document Viewer | OpenSeadragon 5.0.1 |
| Forms | React Hook Form + Zod v4 |
| State | Zustand + Zundo (undo/redo) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Real-time | Supabase Realtime (postgres_changes) |

### OCR Worker (Python)

| Layer | Teknologi |
|-------|-----------|
| Web Framework | FastAPI + Uvicorn |
| OCR Engine | PaddleOCR 2.8.1 + Google Gemini 2.5 Flash |
| Image Processing | OpenCV + Pillow |
| Deploy | Railway (Dockerized) |

---

## Prasyarat

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker Desktop** (untuk Supabase lokal)
- **Supabase CLI** (`npm install -g supabase`)
- **Python 3.10+** (opsional, untuk OCR worker lokal)

---

## Instalasi & Setup Lokal

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/vaskoyudha/PosyanduDigital.git
cd PosyanduDigital
npm install
```

### 2. Setup Supabase Lokal

```bash
# Pastikan Docker Desktop berjalan
supabase start

# Jalankan migrasi database
supabase db push

# Seed data awal (opsional)
supabase db seed
```

Output `supabase start` akan menampilkan URL dan API key yang dibutuhkan.

### 3. Konfigurasi Environment

```bash
cp .env.example .env.local
# Edit .env.local dengan nilai dari output supabase start
```

### 4. Jalankan Dev Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### 5. Buat Akun Test

Di Supabase Studio (`http://localhost:54323`), buat user untuk setiap peran:

| Email | Peran |
|-------|-------|
| kader@test.id | kader |
| bidan@test.id | bidan |
| tpg@test.id | tpg |
| kepala@test.id | kepala_puskesmas |
| dinas@test.id | dinas |

Set kolom `role` di tabel `user_profiles` sesuai peran masing-masing.

---

## Variabel Lingkungan

```bash
# .env.local

# Supabase (dari output `supabase start` atau dashboard Supabase cloud)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini API — https://aistudio.google.com/apikey
GEMINI_API_KEY=

# URL Python OCR Worker (kosongkan untuk menonaktifkan OCR)
WORKER_URL=

# URL aplikasi
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ **Jangan pernah commit** file `.env.local` ke repository.

---

## Struktur Proyek

```
PosyanduDigital/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (authenticated)/    # Route group: halaman terautentikasi
│   │   │   ├── dashboard/      # 5 dasbor per peran
│   │   │   ├── children/       # Registrasi & manajemen anak
│   │   │   ├── upload/         # Upload & monitoring OCR
│   │   │   ├── review/         # Human review OCR
│   │   │   ├── export/         # Ekspor e-PPGBM & PDF
│   │   │   └── admin/          # Audit log (admin only)
│   │   ├── api/                # API Routes
│   │   └── login/              # Halaman login
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── analytics/          # KPI cards, charts, alerts
│   │   ├── children/           # Child forms, growth charts
│   │   ├── ocr/                # Upload dropzone, progress
│   │   ├── review/             # Document viewer, review panel
│   │   └── export/             # Export preview & download
│   ├── lib/
│   │   ├── who/                # WHO Z-score engine (42+44 tests)
│   │   ├── matching/           # Child deduplication (37 tests)
│   │   ├── analytics/          # SKDN, prevalence, alerts
│   │   ├── export/             # Excel & PDF generation
│   │   ├── audit/              # UU PDP audit logging
│   │   └── supabase/           # Client, server, admin, middleware
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript type definitions
├── supabase/
│   ├── migrations/             # 9 SQL migration files
│   ├── seed.sql                # Data seed untuk dev
│   └── config.toml             # Supabase local config
├── worker/                     # Python FastAPI OCR Worker
│   ├── pipeline/               # Preprocessor, detector, extractor
│   ├── main.py                 # FastAPI app
│   ├── Dockerfile              # Docker image untuk Railway
│   └── requirements.txt
└── .env.example                # Template environment variables
```

---

## Peran Pengguna

| Peran | Akses | Dasbor |
|-------|-------|--------|
| `kader` | Upload KMS, tambah anak & pengukuran | SKDN, belum ditimbang, alert |
| `bidan` | Review OCR, commit data, kelola anak | Status OCR, antrian review |
| `tpg` | Analitik gizi, ekspor laporan | Prevalensi, tren, SPM |
| `kepala_puskesmas` | View semua data puskesmas | KPI puskesmas, tren bulanan |
| `dinas` | View semua data lintas puskesmas | Perbandingan wilayah, SPM dinas |

---

## Pipeline OCR

```
Upload Foto KMS
      │
      ▼
[1] Preprocessing     → OpenCV: resize, grayscale, threshold
      │
      ▼
[2] Table Detection   → Deteksi garis tabel, bounding box sel
      │
      ▼
[3] Cell Extraction   → Crop setiap sel dari gambar
      │
      ▼
[4] Text Recognition  → Google Gemini 2.5 Flash per sel
      │
      ▼
[5] Schema Mapping    → Map teks → nama_anak, bb, tb, status_nt
      │
      ▼
[6] Human Review      → Kader/Bidan verifikasi & koreksi
      │
      ▼
[7] Commit            → Data masuk ke tabel measurements
```

Progress dipantau real-time via **Supabase Realtime** (`postgres_changes` pada tabel `ocr_documents`).

---

## Testing

```bash
# Jalankan semua unit tests
npx vitest run

# TypeScript type check
npx tsc --noEmit

# Build production
npm run build
```

**Coverage saat ini: 170/170 tests passing**

| File Test | Tests | Cakupan |
|-----------|-------|---------|
| `who/zscore.test.ts` | 42 | WHO Z-score WAZ/HAZ/WHZ |
| `who/classify.test.ts` | 44 | Klasifikasi status gizi |
| `matching/matching.test.ts` | 37 | Deduplication anak (Jaro-Winkler) |
| `analytics/analytics.test.ts` | 24 | SKDN, prevalensi, alert logic |
| `export/export.test.ts` | 16 | Excel & PDF generation |
| `audit/logger.test.ts` | 7 | Audit logging UU PDP |

---

## Deploy ke Production

### Next.js → Vercel

```bash
npm install -g vercel
vercel --prod
```

Set semua environment variables di **Vercel Dashboard → Settings → Environment Variables**.

### Python OCR Worker → Railway

```bash
npm install -g @railway/cli
railway login
cd worker
railway up
```

Set environment variables di Railway Dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `WORKER_SECRET`

### Database → Supabase Cloud

```bash
supabase db push --db-url "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

---

## Kontribusi

1. Fork repository ini
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m "feat: deskripsi perubahan"`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buat Pull Request

Pastikan semua tests pass sebelum membuat PR:

```bash
npx vitest run && npx tsc --noEmit
```

---

## Lisensi

MIT License — lihat file [LICENSE](LICENSE) untuk detail.

---

<p align="center">
  Dibangun dengan ❤️ untuk kesehatan anak Indonesia
</p>
