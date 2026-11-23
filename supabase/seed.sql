-- ============================================================================
-- DATA AWAL (SEED) RELASIONAL SUPABASE — SMK PRIMA UNGGUL
-- Jalankan setelah supabase/schema.sql di Supabase SQL Editor
-- ============================================================================

-- 1. Seed 6 Kompetensi Keahlian dalam 3 Rumpun Jurusan
insert into public.jurusan (kode, nama, rumpun) values
  ('TKJ', 'Teknik Komputer dan Jaringan', '01. Teknologi Informasi & Desain Kreatif'),
  ('DKV', 'Desain Komunikasi Visual', '01. Teknologi Informasi & Desain Kreatif'),
  ('AK', 'Akuntansi dan Keuangan Lembaga', '02. Akuntansi & Manajemen Perkantoran'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', '02. Akuntansi & Manajemen Perkantoran'),
  ('BC', 'Broadcasting dan Perfilman', '03. Penyiaran Media & Bisnis Digital'),
  ('BD', 'Bisnis Digital', '03. Penyiaran Media & Bisnis Digital')
on conflict (kode) do nothing;

-- 2. Seed Rombongan Belajar (Kelas) yang Berelasi dengan Jurusan
insert into public.kelas (nama, tingkat, jurusan_id)
select v.nama, v.tingkat, j.id
from (values
  ('X TKJ 1', 'X', 'TKJ'),
  ('XI TKJ 1', 'XI', 'TKJ'),
  ('XII TKJ 1', 'XII', 'TKJ'),
  ('X DKV 1', 'X', 'DKV'),
  ('XI DKV 1', 'XI', 'DKV'),
  ('X AK 1', 'X', 'AK'),
  ('XI AK 1', 'XI', 'AK'),
  ('X MPLB 1', 'X', 'MPLB'),
  ('XI MPLB 1', 'XI', 'MPLB'),
  ('X BC 1', 'X', 'BC'),
  ('XI BC 1', 'XI', 'BC'),
  ('X BD 1', 'X', 'BD')
) as v(nama, tingkat, kode_jurusan)
join public.jurusan j on j.kode = v.kode_jurusan
on conflict (nama) do nothing;

-- 3. Seed Siswa Contoh yang Berelasi ke Kelas
insert into public.siswa (nis, nama, kelas_id)
select v.nis, v.nama, k.id
from (values
  ('24251001', 'Aditya Pratama', 'X TKJ 1'),
  ('24251002', 'Bunga Citra Lestari', 'X TKJ 1'),
  ('24251003', 'Dimas Saputra', 'X TKJ 1'),
  ('24251004', 'Eka Putri Maharani', 'XI TKJ 1'),
  ('24251005', 'Fajar Nugroho', 'XI TKJ 1'),
  ('24251006', 'Gita Permata Sari', 'XI TKJ 1'),
  ('24252001', 'Hana Nabila Azzahra', 'X DKV 1'),
  ('24252002', 'Ilham Ramadhan', 'X DKV 1'),
  ('24252003', 'Jihan Aurelia', 'X DKV 1'),
  ('24253001', 'Kartika Dewi', 'X AK 1'),
  ('24253002', 'Lukman Hakim', 'X AK 1'),
  ('24253003', 'Maya Puspitasari', 'X AK 1'),
  ('24254001', 'Nadia Safitri', 'X MPLB 1'),
  ('24254002', 'Oki Setiawan', 'X MPLB 1'),
  ('24254003', 'Putri Wulandari', 'X MPLB 1'),
  ('24255001', 'Rizky Maulana', 'X BC 1'),
  ('24255002', 'Salsa Bila Khairunnisa', 'X BC 1'),
  ('24255003', 'Taufik Hidayat', 'X BC 1'),
  ('24256001', 'Umar Faruq', 'X BD 1'),
  ('24256002', 'Vina Anggraini', 'X BD 1'),
  ('24256003', 'Wahyu Kurniawan', 'X BD 1')
) as v(nis, nama, nama_kelas)
join public.kelas k on k.nama = v.nama_kelas
on conflict (nis) do nothing;
