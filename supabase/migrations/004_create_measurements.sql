-- ============================================
-- MONTHLY MEASUREMENTS
-- ============================================

CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  tanggal_pengukuran DATE NOT NULL,
  umur_bulan SMALLINT NOT NULL,            -- calculated: diff(tanggal_lahir, tanggal_pengukuran)

  -- Anthropometric data
  berat_badan_kg DECIMAL(4,2),
  tinggi_badan_cm DECIMAL(5,1),
  lingkar_kepala_cm DECIMAL(4,1),
  lila_cm DECIMAL(4,1),
  tipe_pengukuran_tb CHAR(2) CHECK (tipe_pengukuran_tb IN ('PB', 'TB')),  -- recumbent vs standing

  -- Calculated Z-scores
  zscore_bb_u DECIMAL(5,2),                -- weight-for-age
  zscore_tb_u DECIMAL(5,2),                -- height-for-age
  zscore_bb_tb DECIMAL(5,2),               -- weight-for-height

  -- Indonesian classifications (Permenkes 2/2020)
  status_bb_u VARCHAR(20),
  status_tb_u VARCHAR(20),
  status_bb_tb VARCHAR(20),

  -- Growth monitoring (N/T system)
  bb_bulan_lalu_kg DECIMAL(4,2),
  kenaikan_bb_gram DECIMAL(6,1),
  kbm_gram DECIMAL(6,1),
  status_naik CHAR(1) CHECK (status_naik IN ('N', 'T', 'O')),
  is_bgm BOOLEAN DEFAULT false,            -- Bawah Garis Merah (BB/U < -3SD)
  is_2t BOOLEAN DEFAULT false,             -- tidak naik 2 consecutive months
  has_edema BOOLEAN DEFAULT false,

  -- Supplementary data
  vitamin_a BOOLEAN DEFAULT false,
  pmt BOOLEAN DEFAULT false,               -- Pemberian Makanan Tambahan
  asi_eksklusif BOOLEAN,                   -- exclusive breastfeeding (0-6mo only)
  keterangan TEXT,

  -- Source tracking
  source_type VARCHAR(20) DEFAULT 'manual', -- 'manual' | 'ocr' | 'import'
  ocr_document_id UUID,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(child_id, tanggal_pengukuran)
);

CREATE INDEX idx_measurements_child ON measurements(child_id);
CREATE INDEX idx_measurements_date ON measurements(tanggal_pengukuran);
CREATE INDEX idx_measurements_bgm ON measurements(is_bgm) WHERE is_bgm = true;
CREATE INDEX idx_measurements_2t ON measurements(is_2t) WHERE is_2t = true;

CREATE TRIGGER update_measurements_updated_at
  BEFORE UPDATE ON measurements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
