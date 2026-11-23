import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { KOMPETENSI_DATA } from '../data/schoolData';

export default function JurusanDetailPage() {
  const { kode } = useParams<{ kode: string }>();
  const upperKode = (kode || '').toUpperCase();
  const detail = KOMPETENSI_DATA[upperKode];

  if (!detail) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-slate-950">Kompetensi Keahlian Tidak Ditemukan</h1>
        <p className="text-sm text-slate-600 mt-2">
          Silakan pilih program keahlian TKJ, DKV, AK, BC, MPLB, atau BD dari beranda.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-red-700 whitespace-nowrap shrink-0">
            SMK Prima Unggul
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {Object.values(KOMPETENSI_DATA).map((item) => (
              <Link
                key={item.kode}
                to={`/jurusan/${item.kode.toLowerCase()}`}
                className={`whitespace-nowrap shrink-0 transition-colors ${
                  item.kode === detail.kode
                    ? 'text-red-700 font-bold underline underline-offset-4'
                    : 'hover:text-red-700'
                }`}
              >
                {item.kode}
              </Link>
            ))}
          </nav>
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Masuk Portal
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-red-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Profil Sekolah
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-700 mb-3">
              <span>Rumpun {detail.rumpunNomor}</span>
              <span aria-hidden="true">·</span>
              <span>{detail.rumpun}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{detail.kode}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 leading-tight">
              {detail.nama}
            </h1>
            <p className="text-base text-slate-600 mt-4 leading-relaxed">
              {detail.deskripsi}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">Rombongan Belajar:</span>
              {detail.kelasContoh.map((k, idx) => (
                <span key={k} className="font-mono">
                  {k}
                  {idx < detail.kelasContoh.length - 1 ? ' / ' : ''}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-full min-h-[260px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={detail.image}
                alt={detail.nama}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mt-14 pt-12 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border border-slate-200 rounded-xl">
            <h2 className="text-base font-bold text-slate-950 mb-4">Kompetensi Inti</h2>
            <ul className="space-y-3">
              {detail.kompetensiUtama.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 border border-slate-200 rounded-xl">
            <h2 className="text-base font-bold text-slate-950 mb-4">Fasilitas Praktik</h2>
            <ul className="space-y-3">
              {detail.fasilitasLab.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 border border-slate-200 rounded-xl">
            <h2 className="text-base font-bold text-slate-950 mb-4">Prospek Karir Lulusan</h2>
            <ul className="space-y-3">
              {detail.prospekKarir.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 p-6 border border-slate-200 rounded-xl bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-950">
              Kelola Absensi Siswa Kelas {detail.kode}
            </h3>
            <p className="text-sm text-slate-600 mt-0.5">
              Masuk ke portal absensi untuk mencatat kehadiran kelas {detail.kelasContoh.join(', ')}.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-red-700 text-white hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Masuk Portal Absensi
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
