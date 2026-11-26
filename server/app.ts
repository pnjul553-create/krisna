import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type Database from 'better-sqlite3';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  nip: string | null;
  jabatan: string | null;
  role: UserRole;
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'smk_auth_token';
const IS_VERCEL = Boolean(process.env.VERCEL);

const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).trim();
const SUPABASE_ANON_KEY = (
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();
const SUPABASE_SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ''
).trim();

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

let supabaseAdmin: SupabaseClient | null = null;
let supabasePublic: SupabaseClient | null = null;
export let USE_SUPABASE = false;

if (
  isValidHttpUrl(SUPABASE_URL) &&
  SUPABASE_ANON_KEY.length > 10 &&
  SUPABASE_SERVICE_ROLE_KEY.length > 10 &&
  !SUPABASE_ANON_KEY.startsWith('MY_') &&
  !SUPABASE_SERVICE_ROLE_KEY.startsWith('MY_')
) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    USE_SUPABASE = true;
  } catch (err) {
    console.warn('Supabase client initialization failed, falling back to SQLite:', err);
    supabaseAdmin = null;
    supabasePublic = null;
    USE_SUPABASE = false;
  }
}

function getTodayWIB(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getOffsetDateWIB(daysAgo: number): string {
  const date = new Date(Date.now() - daysAgo * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getTimeWIB(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

// ==========================================
// SQLITE PERSISTENT BACKEND (LOCAL FALLBACK MODE)
// ==========================================
let db: Database.Database | null = null;

function initSqlite() {
  const require = createRequire(import.meta.url);
  const sqliteModuleName = 'better-sqlite3';
  const DatabaseCtor = require(sqliteModuleName) as typeof Database;

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'smk_prima_unggul.db');
  db = new DatabaseCtor(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      nip TEXT,
      jabatan TEXT,
      role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'tenaga_kependidikan')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jurusan (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL UNIQUE,
      nama TEXT NOT NULL,
      rumpun TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kelas (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL UNIQUE,
      tingkat TEXT NOT NULL,
      jurusan_id TEXT NOT NULL REFERENCES jurusan(id) ON DELETE RESTRICT,
      wali_kelas_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const siswaTableInfo = db.prepare("PRAGMA table_info('siswa')").all() as Array<{ name: string }>;
  const hasLegacySiswa = siswaTableInfo.length > 0 && !siswaTableInfo.some((col) => col.name === 'kelas_id');

  ensureJurusanSeeded(db);

  if (hasLegacySiswa) {
    db.exec(`ALTER TABLE siswa RENAME TO siswa_legacy;`);
    db.exec(`
      CREATE TABLE siswa (
        id TEXT PRIMARY KEY,
        nis TEXT NOT NULL UNIQUE,
        nama TEXT NOT NULL,
        kelas_id TEXT NOT NULL REFERENCES kelas(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    const legacyRows = db.prepare('SELECT id, nis, nama, kelas, jurusan, created_at FROM siswa_legacy').all() as Array<{
      id: string;
      nis: string;
      nama: string;
      kelas: string;
      jurusan: string;
      created_at: string;
    }>;
    const insertMigrated = db.prepare('INSERT INTO siswa (id, nis, nama, kelas_id, created_at) VALUES (?, ?, ?, ?, ?)');
    for (const row of legacyRows) {
      const kelasId = resolveOrCreateSqliteKelas(db, row.kelas, row.jurusan);
      insertMigrated.run(row.id, row.nis, row.nama, kelasId, row.created_at);
    }
    db.exec(`DROP TABLE siswa_legacy;`);
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS siswa (
        id TEXT PRIMARY KEY,
        nis TEXT NOT NULL UNIQUE,
        nama TEXT NOT NULL,
        kelas_id TEXT NOT NULL REFERENCES kelas(id) ON DELETE RESTRICT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS absensi_karyawan (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tanggal TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Dinas Luar')),
      waktu_masuk TEXT,
      waktu_pulang TEXT,
      catatan TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, tanggal)
    );

    CREATE TABLE IF NOT EXISTS absensi_siswa (
      id TEXT PRIMARY KEY,
      siswa_id TEXT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
      tanggal TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Hadir', 'Sakit', 'Izin', 'Alpha')),
      keterangan TEXT,
      recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (siswa_id, tanggal)
    );
  `);

  const userCountRow = db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number };
  if (userCountRow.total === 0) {
    seedLocalDatabase(db);
  }
}

function ensureJurusanSeeded(database: Database.Database) {
  const jurusanList: Array<[string, string, string]> = [
    ['TKJ', 'Teknik Komputer dan Jaringan', '01. Teknologi Informasi & Desain Kreatif'],
    ['DKV', 'Desain Komunikasi Visual', '01. Teknologi Informasi & Desain Kreatif'],
    ['AK', 'Akuntansi dan Keuangan Lembaga', '02. Akuntansi & Manajemen Perkantoran'],
    ['MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', '02. Akuntansi & Manajemen Perkantoran'],
    ['BC', 'Broadcasting dan Perfilman', '03. Penyiaran Media & Bisnis Digital'],
    ['BD', 'Bisnis Digital', '03. Penyiaran Media & Bisnis Digital'],
  ];
  const stmt = database.prepare('INSERT OR IGNORE INTO jurusan (id, kode, nama, rumpun) VALUES (?, ?, ?, ?)');
  for (const [kode, nama, rumpun] of jurusanList) {
    stmt.run(crypto.randomUUID(), kode, nama, rumpun);
  }
}

function resolveOrCreateSqliteKelas(database: Database.Database, namaKelas: string, kodeJurusan?: string): string {
  const cleanKelas = namaKelas.trim();
  const existing = database.prepare('SELECT id FROM kelas WHERE nama = ?').get(cleanKelas) as { id: string } | undefined;
  if (existing) return existing.id;

  const inferredKode =
    (kodeJurusan && ['TKJ', 'DKV', 'AK', 'MPLB', 'BC', 'BD'].includes(kodeJurusan.toUpperCase())
      ? kodeJurusan.toUpperCase()
      : ['TKJ', 'DKV', 'AK', 'MPLB', 'BC', 'BD'].find((j) => cleanKelas.toUpperCase().includes(j))) || 'TKJ';

  const jurusanRow = database.prepare('SELECT id FROM jurusan WHERE kode = ?').get(inferredKode) as { id: string };
  const tingkat = cleanKelas.toUpperCase().startsWith('XII')
    ? 'XII'
    : cleanKelas.toUpperCase().startsWith('XI')
    ? 'XI'
    : 'X';

  const newId = crypto.randomUUID();
  database
    .prepare('INSERT INTO kelas (id, nama, tingkat, jurusan_id) VALUES (?, ?, ?, ?)')
    .run(newId, cleanKelas, tingkat, jurusanRow.id);
  return newId;
}

function seedLocalDatabase(database: Database.Database) {
  const defaultPass = bcrypt.hashSync('PrimaUnggul2026!', 10);

  const adminId = crypto.randomUUID();
  const guru1Id = crypto.randomUUID();
  const guru2Id = crypto.randomUUID();
  const staff1Id = crypto.randomUUID();
  const staff2Id = crypto.randomUUID();

  const insertUser = database.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, nip, jabatan, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insertUser.run(adminId, 'admin@smkprimaunggul.sch.id', defaultPass, 'Hendra Wijaya, S.Kom., M.Pd.', '198204152010011004', 'Administrator Sistem & Kurikulum', 'admin');
  insertUser.run(guru1Id, 'guru@smkprimaunggul.sch.id', defaultPass, 'Siti Rahmawati, S.Pd.', '198907212015032002', 'Guru Produktif TKJ & DKV', 'guru');
  insertUser.run(guru2Id, 'ahmad.fauzi@smkprimaunggul.sch.id', defaultPass, 'Ahmad Fauzi, S.E., M.Ak.', '198611092014021001', 'Guru Produktif Akuntansi & BD', 'guru');
  insertUser.run(staff1Id, 'tendik@smkprimaunggul.sch.id', defaultPass, 'Rina Kusumawati, A.Md.', '199103122019032005', 'Staf Tata Usaha & Kesiswaan', 'tenaga_kependidikan');
  insertUser.run(staff2Id, 'bagus.santoso@smkprimaunggul.sch.id', defaultPass, 'Bagus Santoso', '199308192020121003', 'Teknisi Laboratorium Komputer', 'tenaga_kependidikan');

  const students: Array<[string, string, string, string]> = [
    ['24251001', 'Aditya Pratama', 'X TKJ 1', 'TKJ'],
    ['24251002', 'Bunga Citra Lestari', 'X TKJ 1', 'TKJ'],
    ['24251003', 'Dimas Saputra', 'X TKJ 1', 'TKJ'],
    ['24251004', 'Eka Putri Maharani', 'XI TKJ 1', 'TKJ'],
    ['24251005', 'Fajar Nugroho', 'XI TKJ 1', 'TKJ'],
    ['24251006', 'Gita Permata Sari', 'XI TKJ 1', 'TKJ'],
    ['24252001', 'Hana Nabila Azzahra', 'X DKV 1', 'DKV'],
    ['24252002', 'Ilham Ramadhan', 'X DKV 1', 'DKV'],
    ['24252003', 'Jihan Aurelia', 'X DKV 1', 'DKV'],
    ['24253001', 'Kartika Dewi', 'X AK 1', 'AK'],
    ['24253002', 'Lukman Hakim', 'X AK 1', 'AK'],
    ['24253003', 'Maya Puspitasari', 'X AK 1', 'AK'],
    ['24254001', 'Nadia Safitri', 'X MPLB 1', 'MPLB'],
    ['24254002', 'Oki Setiawan', 'X MPLB 1', 'MPLB'],
    ['24254003', 'Putri Wulandari', 'X MPLB 1', 'MPLB'],
    ['24255001', 'Rizky Maulana', 'X BC 1', 'BC'],
    ['24255002', 'Salsa Bila Khairunnisa', 'X BC 1', 'BC'],
    ['24255003', 'Taufik Hidayat', 'X BC 1', 'BC'],
    ['24256001', 'Umar Faruq', 'X BD 1', 'BD'],
    ['24256002', 'Vina Anggraini', 'X BD 1', 'BD'],
    ['24256003', 'Wahyu Kurniawan', 'X BD 1', 'BD'],
  ];

  const insertSiswa = database.prepare(`
    INSERT INTO siswa (id, nis, nama, kelas_id, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const studentIds: Array<{ id: string; nis: string }> = [];
  for (const [nis, nama, kelas, jurusan] of students) {
    const sid = crypto.randomUUID();
    const kelasId = resolveOrCreateSqliteKelas(database, kelas, jurusan);
    insertSiswa.run(sid, nis, nama, kelasId);
    studentIds.push({ id: sid, nis });
  }

  const insertEmpAtt = database.prepare(`
    INSERT INTO absensi_karyawan (id, user_id, tanggal, status, waktu_masuk, waktu_pulang, catatan)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const yesterday = getOffsetDateWIB(1);
  const twoDaysAgo = getOffsetDateWIB(2);
  const today = getTodayWIB();

  insertEmpAtt.run(crypto.randomUUID(), adminId, twoDaysAgo, 'Hadir', '06:52:10', '15:35:00', 'Rapat koordinasi awal pekan');
  insertEmpAtt.run(crypto.randomUUID(), guru1Id, twoDaysAgo, 'Hadir', '06:58:44', '15:20:15', 'Mengajar kelas X & XI TKJ');
  insertEmpAtt.run(crypto.randomUUID(), staff1Id, twoDaysAgo, 'Hadir', '07:02:11', '16:00:05', 'Pelayanan administrasi siswa');
  insertEmpAtt.run(crypto.randomUUID(), guru2Id, yesterday, 'Hadir', '06:55:00', '15:15:30', null);
  insertEmpAtt.run(crypto.randomUUID(), guru1Id, yesterday, 'Hadir', '07:01:12', '15:25:00', null);
  insertEmpAtt.run(crypto.randomUUID(), staff2Id, yesterday, 'Izin', null, null, 'Izin keperluan keluarga');
  insertEmpAtt.run(crypto.randomUUID(), staff1Id, today, 'Hadir', '06:54:18', null, 'Presensi pagi tepat waktu');

  const insertStuAtt = database.prepare(`
    INSERT INTO absensi_siswa (id, siswa_id, tanggal, status, keterangan, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  studentIds.forEach((s, idx) => {
    const statusYest = idx === 4 ? 'Sakit' : idx === 11 ? 'Izin' : idx === 17 ? 'Alpha' : 'Hadir';
    const ketYest = statusYest === 'Sakit' ? 'Surat keterangan dokter' : statusYest === 'Izin' ? 'Izin acara keluarga' : null;
    insertStuAtt.run(crypto.randomUUID(), s.id, yesterday, statusYest, ketYest, guru1Id);

    if (idx < 9) {
      const statusToday = idx === 2 ? 'Izin' : 'Hadir';
      insertStuAtt.run(crypto.randomUUID(), s.id, today, statusToday, statusToday === 'Izin' ? 'Lomba kompetensi siswa' : null, guru1Id);
    }
  });
}

if (!USE_SUPABASE && !IS_VERCEL) {
  initSqlite();
}

const VERCEL_MISSING_ENV_MESSAGE =
  'Environment variable SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY belum diatur di Vercel Project Settings.';

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
async function ensureSupabaseProfile(
  client: SupabaseClient,
  authUser: { id: string; email?: string; user_metadata?: Record<string, any> }
): Promise<{ profile: AuthUser | null; schemaError?: string }> {
  const { data: existing, error: fetchErr } = await client
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (fetchErr) {
    return { profile: null, schemaError: fetchErr.message };
  }
  if (existing) {
    return { profile: existing as AuthUser };
  }

  const { count, error: countErr } = await client.from('profiles').select('id', { count: 'exact', head: true });
  if (countErr) {
    return { profile: null, schemaError: countErr.message };
  }

  const meta = authUser.user_metadata || {};
  const requestedRole = typeof meta.role === 'string' ? meta.role : '';
  const role: UserRole =
    (count ?? 0) === 0
      ? 'admin'
      : ['admin', 'guru', 'tenaga_kependidikan'].includes(requestedRole)
      ? (requestedRole as UserRole)
      : 'tenaga_kependidikan';

  const cleanEmail = (authUser.email || '').trim().toLowerCase();
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    cleanEmail.split('@')[0] ||
    'Pengguna';

  const { data: created, error: insertErr } = await client
    .from('profiles')
    .upsert({
      id: authUser.id,
      email: cleanEmail,
      full_name: fullName,
      nip: typeof meta.nip === 'string' && meta.nip.trim() ? meta.nip.trim() : null,
      jabatan:
        typeof meta.jabatan === 'string' && meta.jabatan.trim()
          ? meta.jabatan.trim()
          : role === 'admin'
          ? 'Administrator Utama'
          : null,
      role,
    })
    .select('*')
    .single();

  if (insertErr || !created) {
    return { profile: null, schemaError: insertErr?.message };
  }
  return { profile: created as AuthUser };
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const bearerHeader = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : undefined;
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const token = bearerHeader || cookieToken;
    if (!token) {
      return res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan login terlebih dahulu.' });
    }

    if (!bearerHeader && cookieToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const hasCustomHeader = Boolean(req.headers['x-requested-with']);
      const origin = req.headers.origin;
      const expectedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host;
      let sameOrigin = false;
      if (origin && expectedHost) {
        try {
          sameOrigin = new URL(origin).host === expectedHost;
        } catch {
          sameOrigin = false;
        }
      }
      if (!hasCustomHeader && !sameOrigin) {
        return res.status(403).json({ error: 'Permintaan lintas origin tidak diizinkan.' });
      }
    }

    if (USE_SUPABASE && supabaseAdmin) {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !authData?.user) {
        return res.status(401).json({ error: 'Sesi berakhir atau token tidak valid.' });
      }
      const { profile, schemaError } = await ensureSupabaseProfile(supabaseAdmin, authData.user);
      if (!profile) {
        return res.status(schemaError ? 500 : 401).json({
          error: schemaError
            ? `Tabel profil Supabase belum siap (${schemaError}). Jalankan supabase/schema.sql terlebih dahulu.`
            : 'Profil pengguna tidak ditemukan.',
        });
      }
      req.user = profile;
      return next();
    } else if (db) {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
      const user = db
        .prepare('SELECT id, email, full_name, nip, jabatan, role, created_at FROM users WHERE id = ?')
        .get(decoded.sub) as AuthUser | undefined;

      if (!user) {
        return res.status(401).json({ error: 'Akun pengguna telah dihapus atau tidak ditemukan.' });
      }
      req.user = user;
      return next();
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Layanan database belum siap.' });
  } catch {
    return res.status(401).json({ error: 'Sesi tidak valid. Silakan login ulang.' });
  }
}

function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk fitur ini.' });
    }
    return next();
  };
}

// ==========================================
// EXPRESS APPLICATION SETUP
// ==========================================
export const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

function getCookieOptions(req: Request) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  const isHttps = req.secure || forwardedProto.includes('https');
  return {
    httpOnly: true,
    sameSite: isHttps ? ('none' as const) : ('lax' as const),
    secure: isHttps,
    ...(isHttps ? { partitioned: true } : {}),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  } as any;
}

function setSessionCookie(req: Request, res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, getCookieOptions(req));
}

// 1. Auth Status
app.get('/api/auth/status', async (_req: Request, res: Response) => {
  try {
    if (USE_SUPABASE && supabaseAdmin) {
      const { count, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      if (profErr) {
        return res.json({
          provider: 'supabase',
          hasUsers: false,
          schemaReady: false,
          schemaError: profErr.message,
        });
      }

      let hasUsers = (count ?? 0) > 0;
      if (!hasUsers) {
        const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
        if ((authList?.users?.length ?? 0) > 0) {
          hasUsers = true;
        }
      }

      return res.json({ provider: 'supabase', hasUsers, schemaReady: true });
    }
    if (IS_VERCEL) {
      return res.json({
        provider: 'supabase',
        hasUsers: false,
        schemaReady: false,
        schemaError: VERCEL_MISSING_ENV_MESSAGE,
      });
    }
    if (db) {
      const row = db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number };
      return res.json({ provider: 'sqlite', hasUsers: row.total > 0, schemaReady: true });
    }
    return res.json({ provider: 'sqlite', hasUsers: false, schemaReady: true });
  } catch {
    return res.status(500).json({ error: 'Gagal memeriksa status sistem.' });
  }
});

// 2. Get Current User
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// 3. Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    if (USE_SUPABASE && supabasePublic && supabaseAdmin) {
      const { data, error } = await supabasePublic.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error || !data.session || !data.user) {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('email not confirmed')) {
          return res.status(401).json({
            error: 'Email akun belum dikonfirmasi di Supabase Auth. Konfirmasi user di Supabase Dashboard lalu coba lagi.',
          });
        }
        const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
        if ((authList?.users?.length ?? 0) === 0) {
          return res.status(401).json({
            error: 'Belum ada pengguna terdaftar di Supabase. Silakan gunakan tab "Buat Admin Pertama" untuk mendaftarkan akun Anda.',
          });
        }
        return res.status(401).json({ error: 'Email atau kata sandi salah, atau akun belum terdaftar.' });
      }

      const { profile, schemaError } = await ensureSupabaseProfile(supabaseAdmin, data.user);
      if (!profile) {
        return res.status(500).json({
          error: schemaError
            ? `Tabel profil Supabase belum siap (${schemaError}). Jalankan file supabase/schema.sql di Supabase SQL Editor.`
            : 'Gagal memuat profil peran pengguna.',
        });
      }

      setSessionCookie(req, res, data.session.access_token);
      return res.json({ user: profile, token: data.session.access_token });
    }

    if (db) {
      const row = db
        .prepare('SELECT * FROM users WHERE lower(email) = ?')
        .get(cleanEmail) as (AuthUser & { password_hash: string }) | undefined;

      if (!row || !bcrypt.compareSync(password, row.password_hash)) {
        return res.status(401).json({ error: 'Email atau kata sandi salah.' });
      }
      const token = jwt.sign({ sub: row.id, role: row.role }, JWT_SECRET, { expiresIn: '7d' });
      setSessionCookie(req, res, token);
      const { password_hash: _ph, ...user } = row;
      return res.json({ user, token });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Server tidak terkonfigurasi.' });
  } catch {
    return res.status(500).json({ error: 'Terjadi kesalahan saat masuk.' });
  }
});

// 4. Register First Admin (only when 0 users exist)
app.post('/api/auth/register-first', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, nip } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      nip?: string;
    };
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    if (USE_SUPABASE && supabaseAdmin && supabasePublic) {
      const { count, error: countErr } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      if (countErr) {
        return res.status(400).json({
          error: `Tabel database Supabase belum tersedia (${countErr.message}). Jalankan isi file supabase/schema.sql di SQL Editor Supabase terlebih dahulu.`,
        });
      }
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if ((count ?? 0) > 0 || (authList?.users?.length ?? 0) > 0) {
        return res.status(409).json({
          error: 'Akun pertama sudah terdaftar di Supabase. Silakan masuk melalui tab Login atau daftar akun baru.',
        });
      }

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          nip: nip?.trim() || null,
          jabatan: 'Administrator Utama',
          role: 'admin',
        },
      });
      if (createErr || !created.user) {
        return res.status(400).json({ error: createErr?.message || 'Gagal mendaftarkan admin pertama.' });
      }
      const { profile } = await ensureSupabaseProfile(supabaseAdmin, created.user);
      const { data: loginData } = await supabasePublic.auth.signInWithPassword({ email: cleanEmail, password });
      if (loginData.session) {
        setSessionCookie(req, res, loginData.session.access_token);
      }
      return res.status(201).json({
        user: profile,
        token: loginData.session?.access_token,
      });
    }

    if (db) {
      const countRow = db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number };
      if (countRow.total > 0) {
        return res.status(409).json({ error: 'Admin pertama sudah terdaftar. Silakan masuk atau daftar akun baru.' });
      }
      const id = crypto.randomUUID();
      const hash = bcrypt.hashSync(password, 10);
      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, nip, jabatan, role) VALUES (?, ?, ?, ?, ?, ?, 'admin')`
      ).run(id, cleanEmail, hash, full_name.trim(), nip?.trim() || null, 'Administrator Utama');

      const user = db
        .prepare('SELECT id, email, full_name, nip, jabatan, role, created_at FROM users WHERE id = ?')
        .get(id) as AuthUser;
      const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      setSessionCookie(req, res, token);
      return res.status(201).json({ user, token });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal mendaftarkan admin pertama.' });
  }
});

// 4b. Self-Service Registration (First user gets admin; subsequent users get tenaga_kependidikan)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, nip } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      nip?: string;
    };
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    if (USE_SUPABASE && supabaseAdmin && supabasePublic) {
      const { count, error: countErr } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      if (countErr) {
        return res.status(400).json({
          error: `Tabel database Supabase belum tersedia (${countErr.message}). Jalankan isi file supabase/schema.sql di SQL Editor Supabase terlebih dahulu.`,
        });
      }

      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
      const isFirstUser = (count ?? 0) === 0 && (authList?.users?.length ?? 0) === 0;
      const assignedRole: UserRole = isFirstUser ? 'admin' : 'tenaga_kependidikan';
      const assignedJabatan = isFirstUser ? 'Administrator Utama' : 'Tenaga Kependidikan';

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          nip: nip?.trim() || null,
          jabatan: assignedJabatan,
          role: assignedRole,
        },
      });
      if (createErr || !created.user) {
        const msg = (createErr?.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          return res.status(409).json({
            error: 'Email sudah terdaftar di Supabase. Silakan masuk menggunakan tab Login.',
          });
        }
        return res.status(400).json({ error: createErr?.message || 'Gagal mendaftarkan akun baru.' });
      }

      const { profile } = await ensureSupabaseProfile(supabaseAdmin, created.user);
      const { data: loginData } = await supabasePublic.auth.signInWithPassword({ email: cleanEmail, password });
      if (loginData.session) {
        setSessionCookie(req, res, loginData.session.access_token);
      }
      return res.status(201).json({
        user: profile,
        token: loginData.session?.access_token,
      });
    }

    if (db) {
      const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(cleanEmail);
      if (existing) {
        return res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk melalui tab Login.' });
      }
      const countRow = db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number };
      const isFirstUser = countRow.total === 0;
      const assignedRole: UserRole = isFirstUser ? 'admin' : 'tenaga_kependidikan';
      const assignedJabatan = isFirstUser ? 'Administrator Utama' : 'Tenaga Kependidikan';

      const id = crypto.randomUUID();
      const hash = bcrypt.hashSync(password, 10);
      db.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, nip, jabatan, role) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, cleanEmail, hash, full_name.trim(), nip?.trim() || null, assignedJabatan, assignedRole);

      const user = db
        .prepare('SELECT id, email, full_name, nip, jabatan, role, created_at FROM users WHERE id = ?')
        .get(id) as AuthUser;
      const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      setSessionCookie(req, res, token);
      return res.status(201).json({ user, token });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal mendaftarkan akun baru.' });
  }
});

// 5. Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const { maxAge: _maxAge, ...clearOpts } = getCookieOptions(req);
  res.clearCookie(COOKIE_NAME, clearOpts);
  return res.json({ ok: true });
});

// 6. Dashboard Summary
app.get('/api/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = getTodayWIB();
    const user = req.user!;

    if (USE_SUPABASE && supabaseAdmin) {
      const [siswaRes, profilesRes, empTodayRes, stuTodayRes, myTodayRes] = await Promise.all([
        supabaseAdmin.from('siswa').select('id, kelas:kelas_id(nama)'),
        supabaseAdmin.from('profiles').select('id, full_name, role, email, nip'),
        supabaseAdmin.from('absensi_karyawan').select('*').eq('tanggal', today),
        supabaseAdmin.from('absensi_siswa').select('*').eq('tanggal', today),
        supabaseAdmin.from('absensi_karyawan').select('*').eq('user_id', user.id).eq('tanggal', today).maybeSingle(),
      ]);

      const siswaList = (siswaRes.data || []).map((s: any) => ({
        id: s.id,
        kelas: s.kelas?.nama || 'Tanpa Kelas',
      }));
      const profilesList = profilesRes.data || [];
      const empToday = empTodayRes.data || [];
      const stuToday = stuTodayRes.data || [];

      const profileMap = new Map(profilesList.map((p: any) => [p.id, p]));
      const stuAttMap = new Map(stuToday.map((a: any) => [a.siswa_id, a]));

      const kelasMap = new Map<string, { kelas: string; total: number; hadir: number; sakit: number; izin: number; alpha: number }>();
      for (const s of siswaList) {
        if (!kelasMap.has(s.kelas)) {
          kelasMap.set(s.kelas, { kelas: s.kelas, total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 });
        }
        const entry = kelasMap.get(s.kelas)!;
        entry.total += 1;
        const att: any = stuAttMap.get(s.id);
        if (att?.status === 'Hadir') entry.hadir += 1;
        else if (att?.status === 'Sakit') entry.sakit += 1;
        else if (att?.status === 'Izin') entry.izin += 1;
        else if (att?.status === 'Alpha') entry.alpha += 1;
      }

      const recentEmp =
        user.role === 'admin'
          ? empToday.map((r: any) => ({
              ...r,
              full_name: (profileMap.get(r.user_id) as any)?.full_name,
              role: (profileMap.get(r.user_id) as any)?.role,
            }))
          : empToday
              .filter((r: any) => r.user_id === user.id)
              .map((r: any) => ({ ...r, full_name: user.full_name, role: user.role }));

      return res.json({
        today,
        totalSiswa: siswaList.length,
        totalKaryawan: profilesList.length,
        karyawanHadirHariIni: empToday.filter((e: any) => e.status === 'Hadir').length,
        karyawanIzinSakitHariIni: empToday.filter((e: any) => e.status !== 'Hadir').length,
        siswaHadirHariIni: stuToday.filter((s: any) => s.status === 'Hadir').length,
        siswaSakitHariIni: stuToday.filter((s: any) => s.status === 'Sakit').length,
        siswaIzinHariIni: stuToday.filter((s: any) => s.status === 'Izin').length,
        siswaAlphaHariIni: stuToday.filter((s: any) => s.status === 'Alpha').length,
        siswaBelumDiabsen: Math.max(0, siswaList.length - stuToday.length),
        myAttendanceToday: myTodayRes.data || null,
        recentKaryawanAttendance: recentEmp,
        kelasRekapHariIni: Array.from(kelasMap.values()).sort((a, b) => a.kelas.localeCompare(b.kelas)),
      });
    }

    if (db) {
      const totalSiswa = (db.prepare('SELECT COUNT(*) as c FROM siswa').get() as { c: number }).c;
      const totalKaryawan = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;

      const empToday = db
        .prepare(
          `SELECT ak.*, u.full_name, u.email, u.nip, u.role
           FROM absensi_karyawan ak
           JOIN users u ON u.id = ak.user_id
           WHERE ak.tanggal = ?
           ORDER BY ak.created_at DESC`
        )
        .all(today) as any[];

      const stuToday = db.prepare('SELECT * FROM absensi_siswa WHERE tanggal = ?').all(today) as any[];
      const myToday = db
        .prepare('SELECT * FROM absensi_karyawan WHERE user_id = ? AND tanggal = ?')
        .get(user.id, today) as any;

      const siswaRows = db
        .prepare(
          `SELECT s.id, k.nama as kelas
           FROM siswa s
           JOIN kelas k ON k.id = s.kelas_id
           ORDER BY k.nama, s.nama`
        )
        .all() as Array<{
        id: string;
        kelas: string;
      }>;
      const stuMap = new Map(stuToday.map((r) => [r.siswa_id, r]));
      const kelasMap = new Map<string, { kelas: string; total: number; hadir: number; sakit: number; izin: number; alpha: number }>();

      for (const s of siswaRows) {
        if (!kelasMap.has(s.kelas)) {
          kelasMap.set(s.kelas, { kelas: s.kelas, total: 0, hadir: 0, sakit: 0, izin: 0, alpha: 0 });
        }
        const entry = kelasMap.get(s.kelas)!;
        entry.total += 1;
        const att = stuMap.get(s.id);
        if (att?.status === 'Hadir') entry.hadir += 1;
        else if (att?.status === 'Sakit') entry.sakit += 1;
        else if (att?.status === 'Izin') entry.izin += 1;
        else if (att?.status === 'Alpha') entry.alpha += 1;
      }

      const recentEmp =
        user.role === 'admin'
          ? empToday
          : db
              .prepare(
                `SELECT ak.*, u.full_name, u.email, u.nip, u.role
                 FROM absensi_karyawan ak
                 JOIN users u ON u.id = ak.user_id
                 WHERE ak.user_id = ?
                 ORDER BY ak.tanggal DESC LIMIT 7`
              )
              .all(user.id);

      return res.json({
        today,
        totalSiswa,
        totalKaryawan,
        karyawanHadirHariIni: empToday.filter((e) => e.status === 'Hadir').length,
        karyawanIzinSakitHariIni: empToday.filter((e) => e.status !== 'Hadir').length,
        siswaHadirHariIni: stuToday.filter((s) => s.status === 'Hadir').length,
        siswaSakitHariIni: stuToday.filter((s) => s.status === 'Sakit').length,
        siswaIzinHariIni: stuToday.filter((s) => s.status === 'Izin').length,
        siswaAlphaHariIni: stuToday.filter((s) => s.status === 'Alpha').length,
        siswaBelumDiabsen: Math.max(0, totalSiswa - stuToday.length),
        myAttendanceToday: myToday || null,
        recentKaryawanAttendance: recentEmp,
        kelasRekapHariIni: Array.from(kelasMap.values()),
      });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal memuat ringkasan dashboard.' });
  }
});

// 7. Employee Self-Attendance & Recap
app.get('/api/absensi-karyawan', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { start, end, role, mine } = req.query as {
      start?: string;
      end?: string;
      role?: string;
      mine?: string;
    };

    const onlyMine = user.role !== 'admin' || mine === 'true';

    if (USE_SUPABASE && supabaseAdmin) {
      let query = supabaseAdmin.from('absensi_karyawan').select('*').order('tanggal', { ascending: false });
      if (onlyMine) query = query.eq('user_id', user.id);
      if (start) query = query.gte('tanggal', start);
      if (end) query = query.lte('tanggal', end);

      const { data: records, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name, email, nip, role');
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      let enriched = (records || []).map((r: any) => {
        const p: any = pMap.get(r.user_id);
        return {
          ...r,
          full_name: p?.full_name || 'Pengguna',
          email: p?.email || '',
          nip: p?.nip || null,
          role: p?.role || 'tenaga_kependidikan',
        };
      });

      if (role && role !== 'all') {
        enriched = enriched.filter((r: any) => r.role === role);
      }
      return res.json({ records: enriched });
    }

    if (db) {
      const conditions: string[] = [];
      const params: any[] = [];
      if (onlyMine) {
        conditions.push('ak.user_id = ?');
        params.push(user.id);
      }
      if (start) {
        conditions.push('ak.tanggal >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push('ak.tanggal <= ?');
        params.push(end);
      }
      if (role && role !== 'all' && !onlyMine) {
        conditions.push('u.role = ?');
        params.push(role);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const records = db
        .prepare(
          `SELECT ak.*, u.full_name, u.email, u.nip, u.role
           FROM absensi_karyawan ak
           JOIN users u ON u.id = ak.user_id
           ${whereClause}
           ORDER BY ak.tanggal DESC, ak.created_at DESC`
        )
        .all(...params);

      return res.json({ records });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal memuat data absensi karyawan.' });
  }
});

app.post('/api/absensi-karyawan', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { action, status, catatan } = req.body as {
      action?: 'checkin' | 'checkout' | 'status';
      status?: 'Hadir' | 'Izin' | 'Sakit' | 'Dinas Luar';
      catatan?: string;
    };

    const today = getTodayWIB();
    const nowTime = getTimeWIB();

    if (USE_SUPABASE && supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('absensi_karyawan')
        .select('*')
        .eq('user_id', user.id)
        .eq('tanggal', today)
        .maybeSingle();

      if (action === 'checkout') {
        if (!existing) {
          return res.status(400).json({ error: 'Anda belum melakukan presensi masuk hari ini.' });
        }
        const { data: updated, error } = await supabaseAdmin
          .from('absensi_karyawan')
          .update({
            waktu_pulang: nowTime,
            catatan: catatan !== undefined ? catatan : existing.catatan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ record: updated });
      }

      const finalStatus = status || 'Hadir';
      const waktuMasuk = finalStatus === 'Hadir' || finalStatus === 'Dinas Luar' ? existing?.waktu_masuk || nowTime : null;

      const { data: saved, error } = await supabaseAdmin
        .from('absensi_karyawan')
        .upsert(
          {
            user_id: user.id,
            tanggal: today,
            status: finalStatus,
            waktu_masuk: waktuMasuk,
            waktu_pulang: existing?.waktu_pulang || null,
            catatan: catatan?.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,tanggal' }
        )
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ record: saved });
    }

    if (db) {
      const existing = db
        .prepare('SELECT * FROM absensi_karyawan WHERE user_id = ? AND tanggal = ?')
        .get(user.id, today) as any;

      if (action === 'checkout') {
        if (!existing) {
          return res.status(400).json({ error: 'Anda belum melakukan presensi masuk hari ini.' });
        }
        db.prepare('UPDATE absensi_karyawan SET waktu_pulang = ?, catatan = COALESCE(?, catatan) WHERE id = ?').run(
          nowTime,
          catatan?.trim() || null,
          existing.id
        );
        const updated = db.prepare('SELECT * FROM absensi_karyawan WHERE id = ?').get(existing.id);
        return res.json({ record: updated });
      }

      const finalStatus = status || 'Hadir';
      const waktuMasuk = finalStatus === 'Hadir' || finalStatus === 'Dinas Luar' ? existing?.waktu_masuk || nowTime : null;

      if (existing) {
        db.prepare(
          'UPDATE absensi_karyawan SET status = ?, waktu_masuk = ?, catatan = ? WHERE id = ?'
        ).run(finalStatus, waktuMasuk, catatan?.trim() || null, existing.id);
        const updated = db.prepare('SELECT * FROM absensi_karyawan WHERE id = ?').get(existing.id);
        return res.json({ record: updated });
      } else {
        const id = crypto.randomUUID();
        db.prepare(
          'INSERT INTO absensi_karyawan (id, user_id, tanggal, status, waktu_masuk, catatan) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(id, user.id, today, finalStatus, waktuMasuk, catatan?.trim() || null);
        const created = db.prepare('SELECT * FROM absensi_karyawan WHERE id = ?').get(id);
        return res.status(201).json({ record: created });
      }
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal menyimpan absensi karyawan.' });
  }
});

// 8. Relational Jurusan & Kelas Endpoints
app.get('/api/jurusan', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (USE_SUPABASE && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('jurusan').select('*').order('kode');
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ jurusan: data || [] });
    }
    if (db) {
      const jurusan = db.prepare('SELECT * FROM jurusan ORDER BY kode ASC').all();
      return res.json({ jurusan });
    }
    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal memuat data jurusan.' });
  }
});

app.get('/api/kelas', requireAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (USE_SUPABASE && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('kelas')
        .select('id, nama, tingkat, jurusan_id, wali_kelas_id, jurusan:jurusan_id(kode, nama, rumpun)')
        .order('nama');
      if (error) return res.status(500).json({ error: error.message });
      const list = (data || []).map((k: any) => ({
        id: k.id,
        nama: k.nama,
        tingkat: k.tingkat,
        jurusan_id: k.jurusan_id,
        jurusan: k.jurusan?.kode || '',
        nama_jurusan: k.jurusan?.nama || '',
      }));
      return res.json({ kelas: list });
    }
    if (db) {
      const kelas = db
        .prepare(
          `SELECT k.id, k.nama, k.tingkat, k.jurusan_id, j.kode as jurusan, j.nama as nama_jurusan
           FROM kelas k
           JOIN jurusan j ON j.id = k.jurusan_id
           ORDER BY k.nama ASC`
        )
        .all();
      return res.json({ kelas });
    }
    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal memuat data kelas.' });
  }
});

async function resolveOrCreateSupabaseKelas(
  client: SupabaseClient,
  namaKelas: string,
  kodeJurusan?: string
): Promise<string> {
  const cleanKelas = namaKelas.trim();
  const { data: existing } = await client.from('kelas').select('id').eq('nama', cleanKelas).maybeSingle();
  if (existing?.id) return existing.id;

  const inferredKode =
    (kodeJurusan && ['TKJ', 'DKV', 'AK', 'MPLB', 'BC', 'BD'].includes(kodeJurusan.toUpperCase())
      ? kodeJurusan.toUpperCase()
      : ['TKJ', 'DKV', 'AK', 'MPLB', 'BC', 'BD'].find((j) => cleanKelas.toUpperCase().includes(j))) || 'TKJ';

  let { data: jur } = await client.from('jurusan').select('id').eq('kode', inferredKode).maybeSingle();
  if (!jur?.id) {
    const defaults: Record<string, [string, string]> = {
      TKJ: ['Teknik Komputer dan Jaringan', '01. Teknologi Informasi & Desain Kreatif'],
      DKV: ['Desain Komunikasi Visual', '01. Teknologi Informasi & Desain Kreatif'],
      AK: ['Akuntansi dan Keuangan Lembaga', '02. Akuntansi & Manajemen Perkantoran'],
      MPLB: ['Manajemen Perkantoran dan Layanan Bisnis', '02. Akuntansi & Manajemen Perkantoran'],
      BC: ['Broadcasting dan Perfilman', '03. Penyiaran Media & Bisnis Digital'],
      BD: ['Bisnis Digital', '03. Penyiaran Media & Bisnis Digital'],
    };
    const [namaJur, rumpun] = defaults[inferredKode];
    const { data: insertedJur } = await client
      .from('jurusan')
      .insert({ kode: inferredKode, nama: namaJur, rumpun })
      .select('id')
      .single();
    jur = insertedJur;
  }

  const tingkat = cleanKelas.toUpperCase().startsWith('XII')
    ? 'XII'
    : cleanKelas.toUpperCase().startsWith('XI')
    ? 'XI'
    : 'X';

  const { data: createdKelas, error: kelasErr } = await client
    .from('kelas')
    .insert({ nama: cleanKelas, tingkat, jurusan_id: jur!.id })
    .select('id')
    .single();
  if (kelasErr || !createdKelas) {
    throw new Error(kelasErr?.message || 'Gagal membuat relasi kelas.');
  }
  return createdKelas.id;
}

// 9. Master Data Siswa (Relasi siswa -> kelas -> jurusan)
app.get('/api/siswa', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kelas, jurusan, q } = req.query as { kelas?: string; jurusan?: string; q?: string };

    if (USE_SUPABASE && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('siswa')
        .select('id, nis, nama, kelas_id, created_at, kelas_rel:kelas_id(id, nama, tingkat, jurusan_id, jurusan_rel:jurusan_id(id, kode, nama))')
        .order('nama');
      if (error) return res.status(500).json({ error: error.message });

      let list = (data || []).map((s: any) => ({
        id: s.id,
        nis: s.nis,
        nama: s.nama,
        kelas_id: s.kelas_id,
        kelas: s.kelas_rel?.nama || '',
        jurusan_id: s.kelas_rel?.jurusan_id || '',
        jurusan: s.kelas_rel?.jurusan_rel?.kode || '',
        created_at: s.created_at,
      }));

      if (kelas && kelas !== 'all') list = list.filter((s) => s.kelas === kelas);
      if (jurusan && jurusan !== 'all') list = list.filter((s) => s.jurusan === jurusan);
      if (q) {
        const needle = q.toLowerCase();
        list = list.filter((s) => s.nama.toLowerCase().includes(needle) || s.nis.toLowerCase().includes(needle));
      }
      list.sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama));
      return res.json({ siswa: list });
    }

    if (db) {
      const conditions: string[] = [];
      const params: any[] = [];
      if (kelas && kelas !== 'all') {
        conditions.push('k.nama = ?');
        params.push(kelas);
      }
      if (jurusan && jurusan !== 'all') {
        conditions.push('j.kode = ?');
        params.push(jurusan);
      }
      if (q) {
        conditions.push('(lower(s.nama) LIKE ? OR lower(s.nis) LIKE ?)');
        params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const siswa = db
        .prepare(
          `SELECT s.id, s.nis, s.nama, s.kelas_id, k.nama as kelas, j.id as jurusan_id, j.kode as jurusan, s.created_at
           FROM siswa s
           JOIN kelas k ON k.id = s.kelas_id
           JOIN jurusan j ON j.id = k.jurusan_id
           ${whereClause}
           ORDER BY k.nama ASC, s.nama ASC`
        )
        .all(...params);
      return res.json({ siswa });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal memuat data siswa.' });
  }
});

app.post('/api/siswa', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nis, nama, kelas, jurusan } = req.body as {
      nis?: string;
      nama?: string;
      kelas?: string;
      jurusan?: string;
    };
    if (!nis || !nama || !kelas) {
      return res.status(400).json({ error: 'NIS, nama lengkap, dan kelas wajib diisi.' });
    }

    if (USE_SUPABASE && supabaseAdmin) {
      const kelasId = await resolveOrCreateSupabaseKelas(supabaseAdmin, kelas, jurusan);
      const { data, error } = await supabaseAdmin
        .from('siswa')
        .insert({ nis: nis.trim(), nama: nama.trim(), kelas_id: kelasId })
        .select('id, nis, nama, kelas_id, created_at, kelas_rel:kelas_id(nama, jurusan_id, jurusan_rel:jurusan_id(kode))')
        .single();
      if (error) {
        return res.status(400).json({ error: error.message.includes('duplicate') ? 'NIS sudah terdaftar.' : error.message });
      }
      const s: any = data;
      return res.status(201).json({
        siswa: {
          id: s.id,
          nis: s.nis,
          nama: s.nama,
          kelas_id: s.kelas_id,
          kelas: s.kelas_rel?.nama || kelas.trim(),
          jurusan: s.kelas_rel?.jurusan_rel?.kode || jurusan || 'TKJ',
          created_at: s.created_at,
        },
      });
    }

    if (db) {
      const existing = db.prepare('SELECT id FROM siswa WHERE nis = ?').get(nis.trim());
      if (existing) {
        return res.status(400).json({ error: 'NIS sudah terdaftar pada siswa lain.' });
      }
      const id = crypto.randomUUID();
      const kelasId = resolveOrCreateSqliteKelas(db, kelas, jurusan);
      db.prepare('INSERT INTO siswa (id, nis, nama, kelas_id) VALUES (?, ?, ?, ?)').run(
        id,
        nis.trim(),
        nama.trim(),
        kelasId
      );
      const created = db
        .prepare(
          `SELECT s.id, s.nis, s.nama, s.kelas_id, k.nama as kelas, j.id as jurusan_id, j.kode as jurusan, s.created_at
           FROM siswa s
           JOIN kelas k ON k.id = s.kelas_id
           JOIN jurusan j ON j.id = k.jurusan_id
           WHERE s.id = ?`
        )
        .get(id);
      return res.status(201).json({ siswa: created });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal menambahkan siswa.' });
  }
});

app.patch('/api/siswa/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nis, nama, kelas, jurusan } = req.body as {
      nis?: string;
      nama?: string;
      kelas?: string;
      jurusan?: string;
    };
    if (!nis || !nama || !kelas) {
      return res.status(400).json({ error: 'NIS, nama, dan kelas wajib diisi.' });
    }

    if (USE_SUPABASE && supabaseAdmin) {
      const kelasId = await resolveOrCreateSupabaseKelas(supabaseAdmin, kelas, jurusan);
      const { data, error } = await supabaseAdmin
        .from('siswa')
        .update({ nis: nis.trim(), nama: nama.trim(), kelas_id: kelasId, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, nis, nama, kelas_id, created_at, kelas_rel:kelas_id(nama, jurusan_id, jurusan_rel:jurusan_id(kode))')
        .single();
      if (error) return res.status(400).json({ error: error.message });
      const s: any = data;
      return res.json({
        siswa: {
          id: s.id,
          nis: s.nis,
          nama: s.nama,
          kelas_id: s.kelas_id,
          kelas: s.kelas_rel?.nama || kelas.trim(),
          jurusan: s.kelas_rel?.jurusan_rel?.kode || jurusan || 'TKJ',
          created_at: s.created_at,
        },
      });
    }

    if (db) {
      const dup = db.prepare('SELECT id FROM siswa WHERE nis = ? AND id != ?').get(nis.trim(), id);
      if (dup) {
        return res.status(400).json({ error: 'NIS tersebut sudah dipakai siswa lain.' });
      }
      const kelasId = resolveOrCreateSqliteKelas(db, kelas, jurusan);
      db.prepare('UPDATE siswa SET nis = ?, nama = ?, kelas_id = ? WHERE id = ?').run(
        nis.trim(),
        nama.trim(),
        kelasId,
        id
      );
      const updated = db
        .prepare(
          `SELECT s.id, s.nis, s.nama, s.kelas_id, k.nama as kelas, j.id as jurusan_id, j.kode as jurusan, s.created_at
           FROM siswa s
           JOIN kelas k ON k.id = s.kelas_id
           JOIN jurusan j ON j.id = k.jurusan_id
           WHERE s.id = ?`
        )
        .get(id);
      return res.json({ siswa: updated });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Gagal memperbarui data siswa.' });
  }
});

app.delete('/api/siswa/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (USE_SUPABASE && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('siswa').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true });
    }
    if (db) {
      db.prepare('DELETE FROM siswa WHERE id = ?').run(id);
      return res.json({ ok: true });
    }
    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal menghapus siswa.' });
  }
});

// 10. Student Attendance (Admin & Guru)
app.get('/api/absensi-siswa', requireAuth, requireRole(['admin', 'guru']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tanggal, start, end, kelas } = req.query as {
      tanggal?: string;
      start?: string;
      end?: string;
      kelas?: string;
    };

    if (USE_SUPABASE && supabaseAdmin) {
      let query = supabaseAdmin
        .from('absensi_siswa')
        .select('id, siswa_id, tanggal, status, keterangan, recorded_by, created_at, siswa_rel:siswa_id(nis, nama, kelas_rel:kelas_id(nama, jurusan_rel:jurusan_id(kode))), recorder:recorded_by(full_name)')
        .order('tanggal', { ascending: false });
      if (tanggal) query = query.eq('tanggal', tanggal);
      if (start) query = query.gte('tanggal', start);
      if (end) query = query.lte('tanggal', end);

      const { data: records, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      let enriched = (records || []).map((r: any) => ({
        id: r.id,
        siswa_id: r.siswa_id,
        nis: r.siswa_rel?.nis || '',
        nama_siswa: r.siswa_rel?.nama || 'Siswa',
        kelas: r.siswa_rel?.kelas_rel?.nama || '',
        jurusan: r.siswa_rel?.kelas_rel?.jurusan_rel?.kode || '',
        tanggal: r.tanggal,
        status: r.status,
        keterangan: r.keterangan,
        recorded_by: r.recorded_by,
        recorded_by_name: r.recorder?.full_name || null,
        created_at: r.created_at,
      }));
      if (kelas && kelas !== 'all') {
        enriched = enriched.filter((r: any) => r.kelas === kelas);
      }
      return res.json({ records: enriched });
    }

    if (db) {
      const conditions: string[] = [];
      const params: any[] = [];
      if (tanggal) {
        conditions.push('ab.tanggal = ?');
        params.push(tanggal);
      }
      if (start) {
        conditions.push('ab.tanggal >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push('ab.tanggal <= ?');
        params.push(end);
      }
      if (kelas && kelas !== 'all') {
        conditions.push('k.nama = ?');
        params.push(kelas);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const records = db
        .prepare(
          `SELECT ab.*, s.nis, s.nama as nama_siswa, k.nama as kelas, j.kode as jurusan, u.full_name as recorded_by_name
           FROM absensi_siswa ab
           JOIN siswa s ON s.id = ab.siswa_id
           JOIN kelas k ON k.id = s.kelas_id
           JOIN jurusan j ON j.id = k.jurusan_id
           LEFT JOIN users u ON u.id = ab.recorded_by
           ${whereClause}
           ORDER BY ab.tanggal DESC, k.nama ASC, s.nama ASC`
        )
        .all(...params);

      return res.json({ records });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal memuat absensi siswa.' });
  }
});

app.post('/api/absensi-siswa/bulk', requireAuth, requireRole(['admin', 'guru']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { tanggal, items } = req.body as {
      tanggal?: string;
      items?: Array<{ siswa_id: string; status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpha'; keterangan?: string }>;
    };
    const targetDate = tanggal || getTodayWIB();
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Daftar absensi siswa tidak boleh kosong.' });
    }

    if (USE_SUPABASE && supabaseAdmin) {
      const payload = items.map((item) => ({
        siswa_id: item.siswa_id,
        tanggal: targetDate,
        status: item.status,
        keterangan: item.keterangan?.trim() || null,
        recorded_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabaseAdmin.from('absensi_siswa').upsert(payload, { onConflict: 'siswa_id,tanggal' });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ ok: true, count: items.length });
    }

    if (db) {
      const upsertStmt = db.prepare(`
        INSERT INTO absensi_siswa (id, siswa_id, tanggal, status, keterangan, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (siswa_id, tanggal) DO UPDATE SET
          status = excluded.status,
          keterangan = excluded.keterangan,
          recorded_by = excluded.recorded_by
      `);

      const runTx = db.transaction((list: typeof items) => {
        for (const item of list) {
          upsertStmt.run(
            crypto.randomUUID(),
            item.siswa_id,
            targetDate,
            item.status,
            item.keterangan?.trim() || null,
            user.id
          );
        }
      });

      runTx(items);
      return res.json({ ok: true, count: items.length });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal menyimpan absensi siswa.' });
  }
});

// 11. User Management (Admin only - Fully Synced with Supabase Auth & Hard Delete)
app.get('/api/users', requireAuth, requireRole(['admin']), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (USE_SUPABASE && supabaseAdmin) {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ users: profiles || [] });
    }

    if (db) {
      const users = db
        .prepare('SELECT id, email, full_name, nip, jabatan, role, created_at FROM users ORDER BY created_at ASC')
        .all();
      return res.json({ users });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal memuat daftar pengguna.' });
  }
});

app.post('/api/users', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, full_name, nip, jabatan, role } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      nip?: string;
      jabatan?: string;
      role?: UserRole;
    };
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Nama lengkap, email, kata sandi, dan peran wajib diisi.' });
    }
    if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
      return res.status(400).json({ error: 'Peran tidak valid.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    if (USE_SUPABASE && supabaseAdmin) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name.trim(),
          nip: nip?.trim() || null,
          jabatan: jabatan?.trim() || null,
          role,
        },
      });
      if (createErr || !created.user) {
        return res.status(400).json({ error: createErr?.message || 'Gagal membuat user di Supabase Authentication.' });
      }

      const { data: profile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: created.user.id,
          email: cleanEmail,
          full_name: full_name.trim(),
          nip: nip?.trim() || null,
          jabatan: jabatan?.trim() || null,
          role,
        })
        .select()
        .single();

      if (profErr) return res.status(400).json({ error: profErr.message });
      return res.status(201).json({ user: profile });
    }

    if (db) {
      const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(cleanEmail);
      if (existing) {
        return res.status(400).json({ error: 'Email sudah terdaftar.' });
      }
      const id = crypto.randomUUID();
      const hash = bcrypt.hashSync(password, 10);
      db.prepare(
        'INSERT INTO users (id, email, password_hash, full_name, nip, jabatan, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, cleanEmail, hash, full_name.trim(), nip?.trim() || null, jabatan?.trim() || null, role);

      const user = db
        .prepare('SELECT id, email, full_name, nip, jabatan, role, created_at FROM users WHERE id = ?')
        .get(id);
      return res.status(201).json({ user });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal menambahkan pengguna.' });
  }
});

app.patch('/api/users/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, password, full_name, nip, jabatan, role } = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      nip?: string;
      jabatan?: string;
      role?: UserRole;
    };
    if (!email || !full_name || !role) {
      return res.status(400).json({ error: 'Nama lengkap, email, dan peran wajib diisi.' });
    }
    if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
      return res.status(400).json({ error: 'Peran tidak valid.' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    if (USE_SUPABASE && supabaseAdmin) {
      const updatePayload: any = {
        email: cleanEmail,
        user_metadata: {
          full_name: full_name.trim(),
          nip: nip?.trim() || null,
          jabatan: jabatan?.trim() || null,
          role,
        },
      };
      if (password) {
        updatePayload.password = password;
      }

      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);
      if (authErr) {
        return res.status(400).json({ error: authErr.message });
      }

      const { data: profile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .update({
          email: cleanEmail,
          full_name: full_name.trim(),
          nip: nip?.trim() || null,
          jabatan: jabatan?.trim() || null,
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (profErr) return res.status(400).json({ error: profErr.message });
      return res.json({ user: profile });
    }

    if (db) {
      const dup = db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(cleanEmail, id);
      if (dup) {
        return res.status(400).json({ error: 'Email sudah digunakan oleh pengguna lain.' });
      }
      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare(
          'UPDATE users SET email = ?, password_hash = ?, full_name = ?, nip = ?, jabatan = ?, role = ? WHERE id = ?'
        ).run(cleanEmail, hash, full_name.trim(), nip?.trim() || null, jabatan?.trim() || null, role, id);
      } else {
        db.prepare(
          'UPDATE users SET email = ?, full_name = ?, nip = ?, jabatan = ?, role = ? WHERE id = ?'
        ).run(cleanEmail, full_name.trim(), nip?.trim() || null, jabatan?.trim() || null, role, id);
      }

      const updated = db
        .prepare('SELECT id, email, full_name, nip, jabatan, role, created_at FROM users WHERE id = ?')
        .get(id);
      return res.json({ user: updated });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal memperbarui data pengguna.' });
  }
});

app.delete('/api/users/:id', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
    }

    if (USE_SUPABASE && supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id, false);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      await supabaseAdmin.from('profiles').delete().eq('id', id);
      return res.json({ ok: true });
    }

    if (db) {
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return res.json({ ok: true });
    }

    return res.status(500).json({ error: IS_VERCEL ? VERCEL_MISSING_ENV_MESSAGE : 'Database tidak tersedia.' });
  } catch {
    return res.status(500).json({ error: 'Gagal menghapus pengguna secara permanen.' });
  }
});

app.all('/api/*', (_req: Request, res: Response) => {
  return res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
});

export default app;
