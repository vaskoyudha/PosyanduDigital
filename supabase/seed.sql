-- ============================================
-- DEVELOPMENT SEED DATA
-- ============================================
-- NOTE: auth.users must be created via Supabase Auth UI or API
-- before user_profiles can be inserted.
-- This seed creates organizational data only.

INSERT INTO provinces (kode_bps, nama) VALUES
  ('35', 'Jawa Timur');

INSERT INTO districts (province_id, kode_bps, nama) VALUES
  ((SELECT id FROM provinces WHERE kode_bps = '35'), '3578', 'Kota Surabaya');

INSERT INTO subdistricts (district_id, kode_bps, nama) VALUES
  ((SELECT id FROM districts WHERE kode_bps = '3578'), '3578010', 'Genteng');

INSERT INTO villages (subdistrict_id, kode_bps, nama) VALUES
  ((SELECT id FROM subdistricts WHERE kode_bps = '3578010'), '3578010001', 'Genteng'),
  ((SELECT id FROM subdistricts WHERE kode_bps = '3578010'), '3578010002', 'Ketabang');

INSERT INTO puskesmas (district_id, kode, nama, alamat) VALUES
  ((SELECT id FROM districts WHERE kode_bps = '3578'), 'PKM-001', 'Puskesmas Genteng', 'Jl. Genteng Besar No. 1, Surabaya'),
  ((SELECT id FROM districts WHERE kode_bps = '3578'), 'PKM-002', 'Puskesmas Ketabang', 'Jl. Raya Ketabang No. 5, Surabaya');

INSERT INTO posyandu (puskesmas_id, village_id, kode, nama, alamat, rt, rw) VALUES
  ((SELECT id FROM puskesmas WHERE kode = 'PKM-001'), (SELECT id FROM villages WHERE kode_bps = '3578010001'), 'POS-001', 'Posyandu Mawar', 'Jl. Mawar No. 3', '001', '001'),
  ((SELECT id FROM puskesmas WHERE kode = 'PKM-001'), (SELECT id FROM villages WHERE kode_bps = '3578010001'), 'POS-002', 'Posyandu Melati', 'Jl. Melati No. 7', '002', '001'),
  ((SELECT id FROM puskesmas WHERE kode = 'PKM-002'), (SELECT id FROM villages WHERE kode_bps = '3578010002'), 'POS-003', 'Posyandu Anggrek', 'Jl. Anggrek No. 12', '001', '002'),
  ((SELECT id FROM puskesmas WHERE kode = 'PKM-002'), (SELECT id FROM villages WHERE kode_bps = '3578010002'), 'POS-004', 'Posyandu Dahlia', 'Jl. Dahlia No. 4', '002', '002'),
  ((SELECT id FROM puskesmas WHERE kode = 'PKM-001'), (SELECT id FROM villages WHERE kode_bps = '3578010001'), 'POS-005', 'Posyandu Kenanga', 'Jl. Kenanga No. 9', '003', '001');
