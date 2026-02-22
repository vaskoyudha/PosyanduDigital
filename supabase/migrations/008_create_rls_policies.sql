-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all sensitive tables
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_extracted_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY user_profiles_select_own ON user_profiles
  FOR SELECT USING (id = auth.uid());

-- Admin can do everything on user_profiles
CREATE POLICY user_profiles_admin_all ON user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ============================================
-- CHILDREN POLICIES
-- ============================================

-- KADER: only their posyandu
CREATE POLICY kader_children ON children
  FOR ALL
  USING (
    posyandu_id = (
      SELECT posyandu_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'kader'
    )
  );

-- BIDAN/TPG/KEPALA: all posyandu in their puskesmas
CREATE POLICY puskesmas_children ON children
  FOR ALL
  USING (
    posyandu_id IN (
      SELECT p.id FROM posyandu p
      JOIN user_profiles up ON up.puskesmas_id = p.puskesmas_id
      WHERE up.id = auth.uid() AND up.role IN ('bidan', 'tpg', 'kepala_puskesmas')
    )
  );

-- DINAS: all posyandu in their district
CREATE POLICY dinas_children ON children
  FOR ALL
  USING (
    posyandu_id IN (
      SELECT p.id FROM posyandu p
      JOIN puskesmas pk ON pk.id = p.puskesmas_id
      JOIN user_profiles up ON up.district_id = pk.district_id
      WHERE up.id = auth.uid() AND up.role = 'dinas'
    )
  );

-- ADMIN: all children
CREATE POLICY admin_children ON children
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- MEASUREMENTS POLICIES (cascade via children)
-- ============================================

CREATE POLICY measurements_via_children ON measurements
  FOR ALL
  USING (
    child_id IN (SELECT id FROM children)
  );

-- ============================================
-- OCR DOCUMENTS POLICIES
-- ============================================

CREATE POLICY kader_ocr_docs ON ocr_documents
  FOR ALL
  USING (
    posyandu_id = (
      SELECT posyandu_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'kader'
    )
  );

CREATE POLICY puskesmas_ocr_docs ON ocr_documents
  FOR ALL
  USING (
    posyandu_id IN (
      SELECT p.id FROM posyandu p
      JOIN user_profiles up ON up.puskesmas_id = p.puskesmas_id
      WHERE up.id = auth.uid() AND up.role IN ('bidan', 'tpg', 'kepala_puskesmas')
    )
  );

CREATE POLICY admin_ocr_docs ON ocr_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- OCR EXTRACTED ROWS POLICIES
-- ============================================

CREATE POLICY ocr_rows_via_docs ON ocr_extracted_rows
  FOR ALL
  USING (
    document_id IN (SELECT id FROM ocr_documents)
  );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Admin only can read audit logs
CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Any authenticated user can insert audit logs
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
