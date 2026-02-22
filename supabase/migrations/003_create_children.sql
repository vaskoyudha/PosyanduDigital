-- ============================================
-- CHILDREN (BALITA) REGISTRY
-- ============================================

CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nik VARCHAR(16) UNIQUE,                  -- may be NULL if not yet assigned
  no_kk VARCHAR(16),
  nama VARCHAR(200) NOT NULL,
  nama_normalized VARCHAR(200) NOT NULL,   -- lowercase, titles stripped, spelling unified
  tanggal_lahir DATE NOT NULL,
  jenis_kelamin CHAR(1) NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
  anak_ke SMALLINT,
  berat_lahir_kg DECIMAL(4,2),
  panjang_lahir_cm DECIMAL(4,1),
  nama_ibu VARCHAR(200),
  nama_ibu_normalized VARCHAR(200),
  nik_ibu VARCHAR(16),
  nama_ayah VARCHAR(200),
  nik_ayah VARCHAR(16),
  alamat TEXT,
  rt VARCHAR(5),
  rw VARCHAR(5),
  posyandu_id UUID REFERENCES posyandu(id),
  is_active BOOLEAN DEFAULT true,
  consent_given BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  consent_guardian_name VARCHAR(200),
  consent_guardian_relationship VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_children_nama_normalized ON children(nama_normalized);
CREATE INDEX idx_children_tanggal_lahir ON children(tanggal_lahir);
CREATE INDEX idx_children_posyandu ON children(posyandu_id);
CREATE INDEX idx_children_nik ON children(nik) WHERE nik IS NOT NULL;

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
