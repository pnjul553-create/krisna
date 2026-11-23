-- ============================================================================
-- SKEMA DATABASE RELASIONAL SUPABASE — SMK PRIMA UNGGUL
-- Terintegrasi penuh dengan Supabase Authentication (auth.users)
-- Jalankan file ini di Supabase Dashboard -> SQL Editor
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Enum Peran Pengguna
do $$ begin
  create type public.app_role as enum ('admin', 'guru', 'tenaga_kependidikan');
exception
  when duplicate_object then null;
end $$;

-- 2. Tabel Profil Karyawan (Relasi 1-to-1 dengan auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  nip text,
  jabatan text,
  role public.app_role not null default 'tenaga_kependidikan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Trigger Otomatis: User Pertama di Supabase Auth Menjadi 'admin'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count integer;
  assigned_role public.app_role;
  requested_role text;
begin
  select count(*) into user_count from public.profiles;
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'tenaga_kependidikan');

  if user_count = 0 then
    assigned_role := 'admin';
  elsif requested_role in ('admin', 'guru', 'tenaga_kependidikan') then
    assigned_role := requested_role::public.app_role;
  else
    assigned_role := 'tenaga_kependidikan';
  end if;

  insert into public.profiles (id, email, full_name, nip, jabatan, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'nip',
    new.raw_user_meta_data->>'jabatan',
    assigned_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    nip = excluded.nip,
    jabatan = excluded.jabatan,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Tabel Master Jurusan / Kompetensi Keahlian
create table if not exists public.jurusan (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique check (kode in ('TKJ', 'DKV', 'AK', 'MPLB', 'BC', 'BD')),
  nama text not null,
  rumpun text not null,
  created_at timestamptz not null default now()
);

-- 5. Tabel Kelas (Relasi Many-to-One ke jurusan & opsional wali_kelas ke profiles)
create table if not exists public.kelas (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  tingkat text not null check (tingkat in ('X', 'XI', 'XII')),
  jurusan_id uuid not null references public.jurusan(id) on delete restrict,
  wali_kelas_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 6. Tabel Master Data Siswa (Relasi Many-to-One ke kelas)
create table if not exists public.siswa (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  nama text not null,
  kelas_id uuid not null references public.kelas(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Tabel Absensi Karyawan (Relasi Many-to-One ke profiles)
create table if not exists public.absensi_karyawan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tanggal date not null default current_date,
  status text not null check (status in ('Hadir', 'Izin', 'Sakit', 'Dinas Luar')),
  waktu_masuk text,
  waktu_pulang text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tanggal)
);

-- 8. Tabel Absensi Siswa (Relasi Many-to-One ke siswa & pencatat ke profiles)
create table if not exists public.absensi_siswa (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null references public.siswa(id) on delete cascade,
  tanggal date not null default current_date,
  status text not null check (status in ('Hadir', 'Sakit', 'Izin', 'Alpha')),
  keterangan text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (siswa_id, tanggal)
);

-- 9. Indeks Performa Query Relasional
create index if not exists idx_kelas_jurusan_id on public.kelas(jurusan_id);
create index if not exists idx_siswa_kelas_id on public.siswa(kelas_id);
create index if not exists idx_absensi_karyawan_user_tanggal on public.absensi_karyawan(user_id, tanggal desc);
create index if not exists idx_absensi_siswa_siswa_tanggal on public.absensi_siswa(siswa_id, tanggal desc);
create index if not exists idx_absensi_siswa_tanggal on public.absensi_siswa(tanggal desc);

-- 10. Views Relasional untuk Pelaporan
create or replace view public.v_siswa_detail as
select
  s.id,
  s.nis,
  s.nama,
  s.kelas_id,
  k.nama as kelas,
  k.tingkat,
  j.id as jurusan_id,
  j.kode as jurusan,
  j.nama as nama_jurusan,
  j.rumpun,
  s.created_at
from public.siswa s
join public.kelas k on k.id = s.kelas_id
join public.jurusan j on j.id = k.jurusan_id;

create or replace view public.v_absensi_siswa_detail as
select
  ab.id,
  ab.siswa_id,
  s.nis,
  s.nama as nama_siswa,
  k.id as kelas_id,
  k.nama as kelas,
  j.kode as jurusan,
  ab.tanggal,
  ab.status,
  ab.keterangan,
  ab.recorded_by,
  p.full_name as recorded_by_name,
  ab.created_at
from public.absensi_siswa ab
join public.siswa s on s.id = ab.siswa_id
join public.kelas k on k.id = s.kelas_id
join public.jurusan j on j.id = k.jurusan_id
left join public.profiles p on p.id = ab.recorded_by;

-- 11. Helper Function Cek Role untuk RLS
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 12. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.jurusan enable row level security;
alter table public.kelas enable row level security;
alter table public.siswa enable row level security;
alter table public.absensi_karyawan enable row level security;
alter table public.absensi_siswa enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Admin can manage profiles" on public.profiles;
create policy "Admin can manage profiles"
  on public.profiles for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "Authenticated users can read jurusan" on public.jurusan;
create policy "Authenticated users can read jurusan"
  on public.jurusan for select to authenticated using (true);

drop policy if exists "Authenticated users can read kelas" on public.kelas;
create policy "Authenticated users can read kelas"
  on public.kelas for select to authenticated using (true);

drop policy if exists "Admin can manage kelas" on public.kelas;
create policy "Admin can manage kelas"
  on public.kelas for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "Authenticated users can read siswa" on public.siswa;
create policy "Authenticated users can read siswa"
  on public.siswa for select to authenticated using (true);

drop policy if exists "Admin can manage siswa" on public.siswa;
create policy "Admin can manage siswa"
  on public.siswa for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "Users can read own employee attendance or admin reads all" on public.absensi_karyawan;
create policy "Users can read own employee attendance or admin reads all"
  on public.absensi_karyawan for select to authenticated
  using (auth.uid() = user_id or public.current_user_role() = 'admin');

drop policy if exists "Users can manage own employee attendance" on public.absensi_karyawan;
create policy "Users can manage own employee attendance"
  on public.absensi_karyawan for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own employee attendance" on public.absensi_karyawan;
create policy "Users can update own employee attendance"
  on public.absensi_karyawan for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Guru and Admin can manage student attendance" on public.absensi_siswa;
create policy "Guru and Admin can manage student attendance"
  on public.absensi_siswa for all to authenticated
  using (public.current_user_role() in ('admin', 'guru'))
  with check (public.current_user_role() in ('admin', 'guru'));
