import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const {
    user,
    loading,
    hasUsers,
    provider,
    schemaReady,
    schemaError,
    statusError,
    login,
    registerFirstAdmin,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && provider !== null) {
      setMode(!hasUsers ? 'register' : 'login');
    }
  }, [loading, hasUsers, provider]);

  if (!loading && user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'register' && !hasUsers) {
        await registerFirstAdmin({ email, password, full_name: fullName, nip });
      } else {
        await login(email, password);
      }
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Gagal masuk ke sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const quickFillDemo = async (demoEmail: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword('PrimaUnggul2026!');
    setSubmitting(true);
    try {
      await login(demoEmail, 'PrimaUnggul2026!');
      navigate('/app/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Gagal masuk menggunakan akun contoh.');
    } finally {
      setSubmitting(false);
    }
  };

  const showRegisterMode = !loading && provider !== null && !hasUsers && mode === 'register';

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12">
      {/* Left Institutional Panel */}
      <div className="hidden lg:flex lg:col-span-6 relative bg-red-800 text-white flex-col justify-between p-12 overflow-hidden">
        <img
          src="/src/assets/images/hero_smk_campus_1795138399136.jpg"
          alt="Kampus SMK Prima Unggul"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/95 via-red-800/90 to-slate-950/85" />

        <div className="relative z-10">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-white">
            SMK Prima Unggul
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="text-xs font-semibold text-red-200 mb-3">
            Portal Internal Sekolah · Absensi Siswa &amp; Karyawan
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
            Pengelolaan Kehadiran Terintegrasi untuk Seluruh Civitas Akademika
          </h1>
          <p className="text-sm text-red-100 mt-4 leading-relaxed">
            Akses sistem sesuai peran Anda sebagai Administrator, Guru Pengajar, atau Tenaga
            Kependidikan SMK Prima Unggul.
          </p>
        </div>

        <div className="relative z-10 text-xs text-red-200 flex items-center gap-3">
          <span>TKJ</span>
          <span aria-hidden="true">·</span>
          <span>DKV</span>
          <span aria-hidden="true">·</span>
          <span>AK</span>
          <span aria-hidden="true">·</span>
          <span>MPLB</span>
          <span aria-hidden="true">·</span>
          <span>BC</span>
          <span aria-hidden="true">·</span>
          <span>BD</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="lg:col-span-6 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-white">
        <div className="w-full max-w-md mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-red-700 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
              {showRegisterMode ? 'Registrasi Admin Pertama' : 'Masuk ke Portal Absensi'}
            </h2>
            <p className="text-sm text-slate-600 mt-1.5">
              {showRegisterMode
                ? 'Belum ada pengguna terdaftar. Akun pertama yang dibuat otomatis ditetapkan sebagai Administrator sistem.'
                : 'Masukkan email dan kata sandi akun sekolah Anda.'}
            </p>
          </div>

          {!loading && provider !== null && !hasUsers && (
            <div className="mb-6 flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('register');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'register' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Buat Admin Pertama
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'login' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Login
              </button>
            </div>
          )}

          {statusError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900"
            >
              Server API belum merespons ({statusError}). Pastikan aplikasi dijalankan melalui server penuh, lalu muat ulang halaman.
            </div>
          )}

          {!loading && provider === 'supabase' && !schemaReady && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900"
            >
              <div className="font-semibold">Skema database Supabase belum diinisialisasi.</div>
              <div className="mt-1 text-xs leading-relaxed">
                Jalankan isi file <span className="font-mono">supabase/schema.sql</span> dan{' '}
                <span className="font-mono">supabase/seed.sql</span> di Supabase Dashboard &rarr; SQL Editor terlebih dahulu.
                {schemaError ? ` (${schemaError})` : ''}
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {showRegisterMode && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Hendra Wijaya, S.Kom."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-red-700"
                  />
                </div>
                <div>
                  <label htmlFor="nip" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    id="nip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="198204152010011004"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-red-700"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Sekolah
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@smkprimaunggul.sch.id"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-red-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-red-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {showRegisterMode && <UserPlus className="w-4 h-4" />}
              {submitting
                ? 'Memproses...'
                : showRegisterMode
                ? 'Daftarkan Admin Pertama'
                : 'Masuk ke Aplikasi'}
            </button>
          </form>

          {!loading && provider === 'sqlite' && hasUsers && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-3">
                Akses Cepat Uji Peran (Database Lokal)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => quickFillDemo('admin@smkprimaunggul.sch.id')}
                  className="px-3 py-2 text-xs font-semibold text-left border border-slate-200 hover:border-red-300 hover:bg-red-50/50 rounded-lg transition-colors"
                >
                  <div className="text-red-700">Admin</div>
                  <div className="text-slate-500 font-normal truncate mt-0.5">admin@smk...</div>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => quickFillDemo('guru@smkprimaunggul.sch.id')}
                  className="px-3 py-2 text-xs font-semibold text-left border border-slate-200 hover:border-red-300 hover:bg-red-50/50 rounded-lg transition-colors"
                >
                  <div className="text-red-700">Guru</div>
                  <div className="text-slate-500 font-normal truncate mt-0.5">guru@smk...</div>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => quickFillDemo('tendik@smkprimaunggul.sch.id')}
                  className="px-3 py-2 text-xs font-semibold text-left border border-slate-200 hover:border-red-300 hover:bg-red-50/50 rounded-lg transition-colors"
                >
                  <div className="text-red-700">Tendik</div>
                  <div className="text-slate-500 font-normal truncate mt-0.5">tendik@smk...</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
