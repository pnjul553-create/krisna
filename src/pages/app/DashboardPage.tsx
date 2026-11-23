import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatRoleLabel, formatTanggalIndo } from '../../lib/api';
import { DashboardSummary } from '../../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<DashboardSummary>('/api/dashboard/summary')
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-xl text-sm text-red-700">
        {error || 'Gagal memuat data dashboard.'}
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isGuru = user?.role === 'guru';
  const myAtt = summary.myAttendanceToday;

  return (
    <div className="space-y-8">
      {/* Welcome & Self-Attendance Status Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-red-700">
            {formatTanggalIndo(summary.today)} · {formatRoleLabel(user?.role || '')}
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight mt-1">
            Selamat datang, {user?.full_name}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {myAtt
              ? `Status kehadiran Anda hari ini: ${myAtt.status}${
                  myAtt.waktu_masuk ? ` · Masuk pukul ${myAtt.waktu_masuk} WIB` : ''
                }${myAtt.waktu_pulang ? ` · Pulang pukul ${myAtt.waktu_pulang} WIB` : ''}`
              : 'Anda belum mencatat absensi karyawan untuk hari ini.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/app/absensi-karyawan"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            {myAtt ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Kelola Absensi Hari Ini</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Isi Absensi Karyawan</span>
              </>
            )}
          </Link>

          {(isAdmin || isGuru) && (
            <Link
              to="/app/absensi-siswa"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-slate-300 hover:border-red-300 hover:text-red-700 bg-white text-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Absensi Siswa</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Status Presensi Pribadi</div>
          <div className="text-2xl font-extrabold text-slate-950 mt-2">
            {myAtt ? myAtt.status : 'Belum Absen'}
          </div>
          <div className="text-xs font-mono text-slate-500 mt-1 tabular-nums">
            {myAtt?.waktu_masuk ? `Masuk ${myAtt.waktu_masuk}` : 'Menunggu presensi'}
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500">Karyawan Hadir Hari Ini</div>
            <div className="text-2xl font-extrabold text-red-700 mt-2 tabular-nums">
              {summary.karyawanHadirHariIni} / {summary.totalKaryawan}
            </div>
            <div className="text-xs text-slate-500 mt-1 tabular-nums">
              {summary.karyawanIzinSakitHariIni} Izin / Sakit / Dinas Luar
            </div>
          </div>
        )}

        {(isAdmin || isGuru) && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-500">Total Siswa Terdaftar</div>
              <div className="text-2xl font-extrabold text-slate-950 mt-2 tabular-nums">
                {summary.totalSiswa}
              </div>
              <div className="text-xs text-slate-500 mt-1 tabular-nums">
                {summary.kelasRekapHariIni.length} Rombongan Belajar
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-500">Siswa Hadir Hari Ini</div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-2 tabular-nums">
                {summary.siswaHadirHariIni}
              </div>
              <div className="text-xs text-slate-500 mt-1 tabular-nums">
                Sakit {summary.siswaSakitHariIni} · Izin {summary.siswaIzinHariIni} · Alpha{' '}
                {summary.siswaAlphaHariIni} · Belum {summary.siswaBelumDiabsen}
              </div>
            </div>
          </>
        )}

        {!isAdmin && !isGuru && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-500">Jam Masuk Anda</div>
              <div className="text-2xl font-extrabold font-mono text-slate-950 mt-2 tabular-nums">
                {myAtt?.waktu_masuk || '--:--'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Waktu Indonesia Barat (WIB)</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-500">Jam Pulang Anda</div>
              <div className="text-2xl font-extrabold font-mono text-slate-950 mt-2 tabular-nums">
                {myAtt?.waktu_pulang || '--:--'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Waktu Indonesia Barat (WIB)</div>
            </div>
          </>
        )}
      </div>

      {/* Class Attendance Overview for Admin & Guru */}
      {(isAdmin || isGuru) && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-950">
                Ringkasan Kehadiran Siswa Per Kelas Hari Ini
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik menu Absensi Siswa untuk memperbarui kehadiran kelas
              </p>
            </div>
            <Link
              to="/app/rekap/siswa"
              className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap"
            >
              Lihat Rekap Lengkap
            </Link>
          </div>

          {summary.kelasRekapHariIni.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Belum ada data siswa terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-6 py-3">Kelas</th>
                    <th className="px-6 py-3 text-right">Total Siswa</th>
                    <th className="px-6 py-3 text-right">Hadir</th>
                    <th className="px-6 py-3 text-right">Sakit</th>
                    <th className="px-6 py-3 text-right">Izin</th>
                    <th className="px-6 py-3 text-right">Alpha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.kelasRekapHariIni.map((row) => (
                    <tr key={row.kelas} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-semibold text-slate-900">{row.kelas}</td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-700">
                        {row.total}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {row.hadir}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-amber-700">
                        {row.sakit}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-sky-700">
                        {row.izin}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-red-700">
                        {row.alpha}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recent Employee Attendance */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-950">
              {isAdmin ? 'Absensi Karyawan Hari Ini' : 'Riwayat Absensi Karyawan Terakhir Anda'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Catatan presensi masuk & pulang seluruh pegawai hari ini'
                : '7 catatan presensi terakhir Anda'}
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/app/rekap/karyawan"
              className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap"
            >
              Buka Rekap Karyawan
            </Link>
          )}
        </div>

        {summary.recentKaryawanAttendance.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada catatan absensi karyawan yang tercatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Nama Pegawai</th>
                  <th className="px-6 py-3">Peran</th>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Masuk</th>
                  <th className="px-6 py-3 text-right">Pulang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summary.recentKaryawanAttendance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {item.full_name || user?.full_name}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {formatRoleLabel(item.role || user?.role || '')}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {item.tanggal}
                    </td>
                    <td className="px-6 py-3 font-semibold">
                      <span
                        className={
                          item.status === 'Hadir'
                            ? 'text-emerald-700'
                            : item.status === 'Dinas Luar'
                            ? 'text-sky-700'
                            : 'text-amber-700'
                        }
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {item.waktu_masuk || '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {item.waktu_pulang || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
