-- ============================================
-- OCR STORAGE BUCKET & POLICIES
-- ============================================

-- Insert storage bucket for OCR documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ocr-documents', 
  'ocr-documents', 
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg','image/png','image/heic','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies: kader/bidan can upload to own posyandu folder; service role can read all

CREATE POLICY "Authenticated users can upload to own posyandu"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ocr-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can read own uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ocr-documents' AND auth.uid() = owner);

CREATE POLICY "Service role has full access"
  ON storage.objects
  USING (bucket_id = 'ocr-documents' AND auth.role() = 'service_role');
