-- ============================================
-- OCR DOCUMENTS & PIPELINE
-- ============================================

CREATE TYPE ocr_status AS ENUM (
  'uploaded',
  'preprocessing',
  'detecting_table',
  'extracting_cells',
  'recognizing_text',
  'awaiting_review',
  'reviewed',
  'committed',
  'failed'
);

CREATE TABLE ocr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posyandu_id UUID NOT NULL REFERENCES posyandu(id),

  original_filename VARCHAR(255),
  storage_path VARCHAR(500) NOT NULL,
  file_size_bytes INTEGER,
  mime_type VARCHAR(50),

  status ocr_status DEFAULT 'uploaded',
  error_message TEXT,

  preprocessed_path VARCHAR(500),
  deskew_angle DECIMAL(5,2),

  table_detection_result JSONB,
  cell_extraction_result JSONB,
  ocr_raw_result JSONB,
  ocr_structured_result JSONB,
  overall_confidence DECIMAL(3,2),

  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_corrections JSONB,

  bulan_data VARCHAR(7),                    -- YYYY-MM
  form_type VARCHAR(20) DEFAULT 'format_3',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_ocr_documents_status ON ocr_documents(status);
CREATE INDEX idx_ocr_documents_posyandu ON ocr_documents(posyandu_id);

-- ============================================
-- OCR EXTRACTED ROWS (pre-review)
-- ============================================

CREATE TABLE ocr_extracted_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ocr_documents(id) ON DELETE CASCADE,
  row_index SMALLINT NOT NULL,

  nama_anak VARCHAR(200),
  nama_anak_confidence DECIMAL(3,2),
  tanggal_lahir VARCHAR(20),
  tanggal_lahir_confidence DECIMAL(3,2),
  umur VARCHAR(10),
  umur_confidence DECIMAL(3,2),
  jenis_kelamin VARCHAR(5),
  jenis_kelamin_confidence DECIMAL(3,2),
  nama_ibu VARCHAR(200),
  nama_ibu_confidence DECIMAL(3,2),
  alamat VARCHAR(500),
  alamat_confidence DECIMAL(3,2),
  bb_lalu VARCHAR(10),
  bb_lalu_confidence DECIMAL(3,2),
  bb_sekarang VARCHAR(10),
  bb_sekarang_confidence DECIMAL(3,2),
  tb VARCHAR(10),
  tb_confidence DECIMAL(3,2),
  status_nt VARCHAR(5),
  status_nt_confidence DECIMAL(3,2),

  bbox JSONB,                              -- {x, y, width, height} in image coordinates

  is_reviewed BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  matched_child_id UUID REFERENCES children(id),
  corrections JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ocr_rows_document ON ocr_extracted_rows(document_id);

CREATE TRIGGER update_ocr_documents_updated_at
  BEFORE UPDATE ON ocr_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
