-- ============================================
-- ORGANIZATIONAL HIERARCHY
-- ============================================

CREATE TABLE provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_bps VARCHAR(2) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES provinces(id),
  kode_bps VARCHAR(4) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subdistricts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID REFERENCES districts(id),
  kode_bps VARCHAR(7) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdistrict_id UUID REFERENCES subdistricts(id),
  kode_bps VARCHAR(10) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE puskesmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID REFERENCES districts(id),
  kode VARCHAR(20) NOT NULL UNIQUE,
  nama VARCHAR(200) NOT NULL,
  alamat TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE posyandu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puskesmas_id UUID REFERENCES puskesmas(id),
  village_id UUID REFERENCES villages(id),
  kode VARCHAR(20) NOT NULL,
  nama VARCHAR(200) NOT NULL,
  alamat TEXT,
  rt VARCHAR(5),
  rw VARCHAR(5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(puskesmas_id, kode)
);
