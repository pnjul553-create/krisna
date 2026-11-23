import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Clock, LogOut as CheckoutIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  apiFetch,
  formatRoleLabel,
  formatShortDate,
  formatTanggalIndo,
  getTodayInputDate,
} from '../../lib/api';
import { AbsensiKaryawan, StatusKaryawan } from '../../types';

export default function AbsensiKaryawanPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AbsensiKaryawan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusPilihan, setStatusPilihan] = useState<StatusKaryawan>('Hadir');
  const [catatan, setCatatan] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [nowClock, setNowClock] = useState(() =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date())
  );

  const today = getTodayInputDate();

  useEffect(() => {
    const timer = setInterval(() => {
      setNowClock(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date())
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchMyHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ records: AbsensiKaryawan[] }>('/api/absensi-karyawan?mine=true');
      setRecords(res.records);
      const todayRec = res.records.find((r) => r.tanggal === today);
      if (todayRec) {
        setStatusPilihan(todayRec.status);
        setCatatan(todayRec.catatan || '');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchMyHistory();
  }, [fetchMyHistory]);

  const todayRecord = records.find((r) => r.tanggal === today);

  const handleCheckInOrStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/api/absensi-karyawan', {
        method: 'POST',
        body: JSON.stringify({
          action: 'checkin',
          status: statusPilihan,
          catatan,
        }),
      });
      setMessage({ type: 'success', text: 'Presensi karyawan berhasil disimpan.' });
      await fetchMyHistory();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/api/absensi-karyawan', {
        method: 'POST',
        body: JSON.stringify({
          action: 'checkout',
          catatan,
        }),
      });
      setMessage({ type: 'success', text: 'Jam pulang berhasil dicatat.' });
      await fetchMyHistory();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Self Attendance Form Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-semibold text-red-700">
              Presensi Mandiri Karyawan · {formatRoleLabel(user?.role || '')}
            </p>
            <h2 className="text-xl font-extrabold text-slate-950 mt-1">
              {formatTanggalIndo(today)}
            </h2>
          </div>

          <div className="text-left md:text-right">
            <div className="text-xs text-slate-500">Waktu Server (WIB)</div>
            <div className="text-2xl font-extrabold font-mono text-slate-950 tabular-nums mt-0.5">
              {nowClock}
            </div>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className={`mt-6 p-3.5 rounded-lg border text-sm ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleCheckInOrStatus} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2.5">
              Pilih Status Kehadiran Hari Ini
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['Hadir', 'Izin', 'Sakit', 'Dinas Luar'] as StatusKaryawan[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusPilihan(status)}
                  className={`px-4 py-3 text-sm font-semibold rounded-lg border text-left transition-colors ${
                    statusPilihan === status
                      ? 'border-red-700 bg-red-50 text-red-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="catatan" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Catatan / Keterangan (Opsional)
            </label>
            <textarea
              id="catatan"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Mengajar kelas XI TKJ 1 atau keterangan izin/dinas luar..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-red-700"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-600 font-mono tabular-nums">
              {todayRecord ? (
                <span>
                  Tercatat hari ini: <strong>{todayRecord.status}</strong>
                  {todayRecord.waktu_masuk ? ` · Masuk ${todayRecord.waktu_masuk}` : ''}
                  {todayRecord.waktu_pulang ? ` · Pulang ${todayRecord.waktu_pulang}` : ''}
                </span>
              ) : (
                <span>Belum ada presensi hari ini</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                {todayRecord ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Perbarui Presensi</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Simpan Presensi Masuk</span>
                  </>
                )}
              </button>

              {todayRecord && (todayRecord.status === 'Hadir' || todayRecord.status === 'Dinas Luar') && (
                <button
                  type="button"
                  disabled={submitting || Boolean(todayRecord.waktu_pulang)}
                  onClick={handleCheckout}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-slate-300 hover:border-red-700 hover:text-red-700 disabled:opacity-50 bg-white text-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  <CheckoutIcon className="w-4 h-4" />
                  <span>
                    {todayRecord.waktu_pulang
                      ? `Sudah Pulang (${todayRecord.waktu_pulang})`
                      : 'Catat Jam Pulang'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Personal Attendance History */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-950">Riwayat Absensi Pribadi</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kehadiran harian Anda yang tersimpan dalam sistem
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat riwayat presensi...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada riwayat absensi karyawan untuk akun ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Waktu Masuk</th>
                  <th className="px-6 py-3 text-right">Waktu Pulang</th>
                  <th className="px-6 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {formatShortDate(rec.tanggal)}
                    </td>
                    <td className="px-6 py-3 font-semibold">
                      <span
                        className={
                          rec.status === 'Hadir'
                            ? 'text-emerald-700'
                            : rec.status === 'Dinas Luar'
                            ? 'text-sky-700'
                            : 'text-amber-700'
                        }
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {rec.waktu_masuk || '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {rec.waktu_pulang || '-'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{rec.catatan || '-'}</td>
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
