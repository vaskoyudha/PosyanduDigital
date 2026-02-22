-- ============================================
-- USER MANAGEMENT (extends Supabase Auth)
-- ============================================

CREATE TYPE user_role AS ENUM (
  'kader',
  'bidan',
  'tpg',
  'kepala_puskesmas',
  'dinas',
  'admin'
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  nama VARCHAR(200) NOT NULL,
  nip VARCHAR(20),
  phone VARCHAR(20),
  posyandu_id UUID REFERENCES posyandu(id),
  puskesmas_id UUID REFERENCES puskesmas(id),
  district_id UUID REFERENCES districts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
