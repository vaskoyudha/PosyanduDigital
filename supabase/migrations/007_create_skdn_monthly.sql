-- ============================================
-- SKDN MONTHLY AGGREGATES
-- ============================================

CREATE TABLE skdn_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posyandu_id UUID NOT NULL REFERENCES posyandu(id),
  bulan DATE NOT NULL,                     -- first day of month

  s_sasaran INTEGER DEFAULT 0,             -- total registered children
  k_ber_kms INTEGER DEFAULT 0,             -- children with KMS/active records
  d_ditimbang INTEGER DEFAULT 0,           -- children weighed this month
  n_naik INTEGER DEFAULT 0,                -- children with adequate weight gain

  bgm_count INTEGER DEFAULT 0,
  t2_count INTEGER DEFAULT 0,              -- 2T (tidak naik 2 bulan berturut-turut)

  stunting_count INTEGER DEFAULT 0,
  wasting_count INTEGER DEFAULT 0,
  underweight_count INTEGER DEFAULT 0,
  overweight_count INTEGER DEFAULT 0,

  -- Derived ratios (stored for query performance)
  ratio_ds DECIMAL(5,2),                   -- D/S * 100
  ratio_nd DECIMAL(5,2),                   -- N/D * 100
  ratio_ks DECIMAL(5,2),                   -- K/S * 100

  calculated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(posyandu_id, bulan)
);

CREATE INDEX idx_skdn_posyandu ON skdn_monthly(posyandu_id);
CREATE INDEX idx_skdn_bulan ON skdn_monthly(bulan);
