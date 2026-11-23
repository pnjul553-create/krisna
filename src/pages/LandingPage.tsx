import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock, Users, ClipboardCheck } from 'lucide-react';
import { RUMPUN_JURUSAN, KOMPETENSI_DATA } from '../data/schoolData';

export default function LandingPage() {
  const [selectedRumpun, setSelectedRumpun] = useState<string>('all');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const visibleRumpun =
    selectedRumpun === 'all'
      ? RUMPUN_JURUSAN
      : RUMPUN_JURUSAN.filter((r) => r.nomor === selectedRumpun);

  const handleImgError = (key: string) => {
    setImgErrors((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-red-700 whitespace-nowrap shrink-0"
          >
            SMK Prima Unggul
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#profil"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Profil Sekolah
            </a>
            <a
              href="#jurusan"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Program Jurusan
            </a>
            <a
              href="#absensi"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sistem Absensi
            </a>
            <a
              href="#kontak"
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Kontak
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Masuk Portal
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section id="profil" className="border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs font-semibold tracking-wide text-red-700 mb-3">
                  Sekolah Menengah Kejuruan Terakreditasi A · Tangerang
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold tracking-tight text-slate-950 leading-[1.12] mb-5">
                  Pendidikan Vokasi Terapan untuk Talenta Industri Modern
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                  SMK Prima Unggul memadukan pembelajaran praktik bengkel industri, kedisiplinan
                  akademik, dan tata kelola absensi digital terpadu bagi seluruh siswa, guru, dan
                  tenaga kependidikan.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Akses Portal Absensi
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#jurusan"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Lihat 3 Rumpun Jurusan
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[280px] sm:min-h-[360px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  {!imgErrors.hero ? (
                    <img
                      src="/src/assets/images/hero_smk_campus_1795138399136.jpg"
                      alt="Gedung utama dan halaman kampus SMK Prima Unggul"
                      referrerPolicy="no-referrer"
                      onError={() => handleImgError('hero')}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-50 to-slate-100 text-center">
                      <span className="text-lg font-bold text-red-800">Kampus SMK Prima Unggul</span>
                      <span className="text-sm text-slate-600 mt-1">Gedung Pembelajaran Utama</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-6">
                    <p className="text-xs font-medium text-red-200">
                      Kurikulum Merdeka Berbasis Industri
                    </p>
                    <p className="text-sm sm:text-base font-semibold text-white mt-0.5">
                      6 Kompetensi Keahlian dalam 3 Bidang Keahlian Utama
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Column Quantitative Strip below hero */}
            <div className="mt-12 pt-10 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-red-700 tabular-nums">
                  3 Bidang
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Rumpun Jurusan Vokasi Terstruktur
                </p>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tabular-nums">
                  6 Kompetensi
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  TKJ, DKV, AK, MPLB, BC, dan BD
                </p>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tabular-nums">
                  92,4%
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Penyerapan Lulusan &amp; Wirausaha 2025
                </p>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tabular-nums">
                  40+ Mitra
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Perusahaan Penyalur Praktik Kerja Lapangan
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Profil & 3 Rumpun Jurusan (6 Kompetensi: TKJ, DKV, AK, BC, MPLB, BD) */}
        <section id="jurusan" className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold text-red-700 mb-2">
                  Program Keahlian SMK Prima Unggul
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                  3 Rumpun Jurusan dengan 6 Kompetensi Keahlian Unggulan
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
                  Seluruh peserta didik dibimbing melalui tiga rumpun kejuruan yang menaungi
                  kompetensi TKJ, DKV, AK, BC, MPLB, dan BD dengan fasilitas laboratorium berstandar
                  industri.
                </p>
              </div>

              {/* Interactive Rumpun Filter Controls */}
              <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shrink-0 self-start">
                <button
                  type="button"
                  onClick={() => setSelectedRumpun('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    selectedRumpun === 'all'
                      ? 'bg-red-700 text-white'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  Semua Rumpun
                </button>
                {RUMPUN_JURUSAN.map((r) => (
                  <button
                    key={r.nomor}
                    type="button"
                    onClick={() => setSelectedRumpun(r.nomor)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      selectedRumpun === r.nomor
                        ? 'bg-red-700 text-white'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {r.nomor}. {r.kompetensi.join(' & ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              {visibleRumpun.map((rumpun) => (
                <div
                  key={rumpun.nomor}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
                >
                  <div className="lg:col-span-4 bg-slate-100 min-h-[220px]">
                    {!imgErrors[rumpun.nomor] ? (
                      <img
                        src={rumpun.image}
                        alt={rumpun.nama}
                        referrerPolicy="no-referrer"
                        onError={() => handleImgError(rumpun.nomor)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-6 bg-red-50 text-red-800 font-bold">
                        {rumpun.nama}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-700 mb-2">
                        <span>Jurusan {rumpun.nomor}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500">{rumpun.subjudul}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
                        {rumpun.nama}
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-2xl">
                        {rumpun.deskripsi}
                      </p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {rumpun.kompetensi.map((kode) => {
                        const detail = KOMPETENSI_DATA[kode];
                        return (
                          <Link
                            key={kode}
                            to={`/jurusan/${kode.toLowerCase()}`}
                            className="group block p-4 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/30 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-semibold text-red-700">
                                {detail.kode}
                              </span>
                              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-red-700 transition-colors" />
                            </div>
                            <h4 className="text-base font-bold text-slate-950 mt-1 group-hover:text-red-800 transition-colors">
                              {detail.nama}
                            </h4>
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                              {detail.ringkasan}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Sistem Absensi Terpadu */}
        <section id="absensi" className="py-16 lg:py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-red-700 mb-2">
                Tata Kelola Kedisiplinan Sekolah
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
                Satu Portal Absensi untuk Siswa, Guru, dan Tenaga Kependidikan
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
                Setiap peran memiliki ruang kerja yang terstruktur untuk mencatat kehadiran harian,
                memantau keterlambatan, dan mengunduh rekapitulasi absensi secara akurat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">
                  01. Absensi Mandiri Karyawan
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Admin, Guru, dan Tenaga Kependidikan mencatat jam masuk, jam pulang, maupun status
                  izin atau dinas luar langsung dari dasbor pribadi.
                </p>
              </div>

              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-4">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">
                  02. Presensi Siswa oleh Guru
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Guru memilih kelas pada daftar jurusan TKJ, DKV, AK, MPLB, BC, atau BD lalu
                  menetapkan status Hadir, Sakit, Izin, atau Alpha secara massal.
                </p>
              </div>

              <div className="p-6 border border-slate-200 rounded-xl bg-white">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">
                  03. Rekap &amp; Kontrol Admin
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Admin mengelola data induk siswa, memantau rekap kehadiran karyawan maupun siswa,
                  serta menyinkronkan akun pengguna secara penuh.
                </p>
              </div>
            </div>

            <div className="mt-12 p-8 rounded-xl bg-red-700 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  Siap Mengakses Sistem Absensi SMK Prima Unggul?
                </h3>
                <p className="text-sm text-red-100 mt-1">
                  Masuk menggunakan akun resmi Admin, Guru, atau Tenaga Kependidikan sekolah.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Masuk Sekarang
                <CheckCircle2 className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer id="kontak" className="bg-slate-950 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-base font-extrabold text-white">SMK Prima Unggul</div>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Jl. Pendidikan Vokasi No. 45, Kota Tangerang, Banten 15111
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Jam Operasional: Senin – Jumat, 06.30 – 16.00 WIB
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-white mb-3">Kompetensi Keahlian</div>
            <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-400">
              {Object.values(KOMPETENSI_DATA).map((k) => (
                <Link
                  key={k.kode}
                  to={`/jurusan/${k.kode.toLowerCase()}`}
                  className="hover:text-white transition-colors"
                >
                  {k.kode} — {k.nama.split(' ')[0]}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white mb-3">Portal Layanan</div>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <Link to="/login" className="hover:text-white transition-colors">
                Login Sistem Absensi
              </Link>
              <a href="mailto:info@smkprimaunggul.sch.id" className="hover:text-white transition-colors">
                info@smkprimaunggul.sch.id
              </a>
              <span className="font-mono text-xs text-slate-500 mt-1">(021) 5578-9021</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>© 2026 SMK Prima Unggul. Seluruh hak cipta dilindungi.</span>
          <span>Portal Profil &amp; Sistem Absensi Terpadu</span>
        </div>
      </footer>
    </div>
  );
}
