import { useEffect, useState, useCallback } from 'react';
import { Download, Search } from 'lucide-react';
import {
  apiFetch,
  downloadCsv,
  formatRoleLabel,
  formatShortDate,
  getTodayInputDate,
} from '../../lib/api';
import { AbsensiKaryawan } from '../../types';

export default function RekapKaryawanPage() {
  const today = getTodayInputDate();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<AbsensiKaryawan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await apiFetch<{ records: AbsensiKaryawan[] }>(
        `/api/absensi-karyawan?${params.toString()}`
      );
      setRecords(res.records);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, roleFilter]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.nip || '').toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    downloadCsv(
      `rekap-absensi-karyawan-${startDate}-sd-${endDate}.csv`,
      ['Tanggal', 'Nama Karyawan', 'NIP', 'Peran', 'Status', 'Waktu Masuk', 'Waktu Pulang', 'Catatan'],
      filtered.map((r) => [
        r.tanggal,
        r.full_name || '-',
        r.nip || '-',
        formatRoleLabel(r.role || ''),
        r.status,
        r.waktu_masuk || '-',
        r.waktu_pulang || '-',
        r.catatan || '-',
      ])
    );
  };

  const summary = filtered.reduce(
    (acc, r) => {
      if (r.status === 'Hadir') acc.hadir += 1;
      else if (r.status === 'Izin') acc.izin += 1;
      else if (r.status === 'Sakit') acc.sakit += 1;
      else if (r.status === 'Dinas Luar') acc.dinas += 1;
      return acc;
    },
    { hadir: 0, izin: 0, sakit: 0, dinas: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div>
              <label htmlFor="rk-start" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dari Tanggal
              </label>
              <input
                id="rk-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div>
              <label htmlFor="rk-end" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sampai Tanggal
              </label>
              <input
                id="rk-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div>
              <label htmlFor="rk-role" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Filter Peran
              </label>
              <select
                id="rk-role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="all">Semua Karyawan</option>
                <option value="admin">Admin</option>
                <option value="guru">Guru</option>
                <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
              </select>
            </div>

            <div>
              <label htmlFor="rk-search" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cari Pegawai
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="rk-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nama / NIP..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-5 text-xs text-slate-600 tabular-nums">
          <span>
            Total Catatan: <strong className="text-slate-950">{filtered.length}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-700 font-semibold">Hadir: {summary.hadir}</span>
          <span className="text-sky-700 font-semibold">Dinas Luar: {summary.dinas}</span>
          <span className="text-amber-700 font-semibold">Izin: {summary.izin}</span>
          <span className="text-red-700 font-semibold">Sakit: {summary.sakit}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat rekap absensi karyawan...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada data absensi karyawan pada rentang tanggal ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Nama Pegawai</th>
                  <th className="px-5 py-3">Peran</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Masuk</th>
                  <th className="px-5 py-3 text-right">Pulang</th>
                  <th className="px-5 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {formatShortDate(rec.tanggal)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{rec.full_name}</div>
                      {rec.nip && (
                        <div className="text-xs font-mono text-slate-500 tabular-nums">{rec.nip}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {formatRoleLabel(rec.role || '')}
                    </td>
                    <td className="px-5 py-3 font-semibold whitespace-nowrap">
                      <span
                        className={
                          rec.status === 'Hadir'
                            ? 'text-emerald-700'
                            : rec.status === 'Dinas Luar'
                            ? 'text-sky-700'
                            : rec.status === 'Izin'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {rec.waktu_masuk || '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                      {rec.waktu_pulang || '-'}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{rec.catatan || '-'}</td>
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
