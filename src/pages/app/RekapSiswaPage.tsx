import { useEffect, useState, useCallback } from 'react';
import { Download, Search } from 'lucide-react';
import { apiFetch, downloadCsv, formatShortDate, getTodayInputDate } from '../../lib/api';
import { AbsensiSiswa, Siswa } from '../../types';

export default function RekapSiswaPage() {
  const today = getTodayInputDate();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(today);
  const [kelasFilter, setKelasFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<AbsensiSiswa[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      if (kelasFilter !== 'all') params.set('kelas', kelasFilter);

      const [attRes, siswaRes] = await Promise.all([
        apiFetch<{ records: AbsensiSiswa[] }>(`/api/absensi-siswa?${params.toString()}`),
        apiFetch<{ siswa: Siswa[] }>('/api/siswa'),
      ]);

      setRecords(attRes.records);
      setKelasList(Array.from(new Set(siswaRes.siswa.map((s) => s.kelas))).sort());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, kelasFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.nama_siswa || '').toLowerCase().includes(q) ||
      (r.nis || '').toLowerCase().includes(q) ||
      (r.kelas || '').toLowerCase().includes(q)
    );
  });

  const summary = filtered.reduce(
    (acc, r) => {
      if (r.status === 'Hadir') acc.hadir += 1;
      else if (r.status === 'Sakit') acc.sakit += 1;
      else if (r.status === 'Izin') acc.izin += 1;
      else if (r.status === 'Alpha') acc.alpha += 1;
      return acc;
    },
    { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
  );

  const handleExport = () => {
    downloadCsv(
      `rekap-absensi-siswa-${startDate}-sd-${endDate}.csv`,
      ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Status', 'Keterangan', 'Dicatat Oleh'],
      filtered.map((r) => [
        r.tanggal,
        r.nis || '-',
        r.nama_siswa || '-',
        r.kelas || '-',
        r.status,
        r.keterangan || '-',
        r.recorded_by_name || '-',
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div>
              <label htmlFor="rs-start" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dari Tanggal
              </label>
              <input
                id="rs-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div>
              <label htmlFor="rs-end" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sampai Tanggal
              </label>
              <input
                id="rs-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div>
              <label htmlFor="rs-kelas" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Filter Kelas
              </label>
              <select
                id="rs-kelas"
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="all">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rs-search" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cari Siswa
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="rs-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="NIS atau nama..."
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
          <span className="text-amber-700 font-semibold">Sakit: {summary.sakit}</span>
          <span className="text-sky-700 font-semibold">Izin: {summary.izin}</span>
          <span className="text-red-700 font-semibold">Alpha: {summary.alpha}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat rekap absensi siswa...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada catatan absensi siswa pada rentang tanggal ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">NIS</th>
                  <th className="px-5 py-3">Nama Siswa</th>
                  <th className="px-5 py-3">Kelas</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Keterangan</th>
                  <th className="px-5 py-3">Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {formatShortDate(rec.tanggal)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {rec.nis}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {rec.nama_siswa}
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{rec.kelas}</td>
                    <td className="px-5 py-3 font-semibold whitespace-nowrap">
                      <span
                        className={
                          rec.status === 'Hadir'
                            ? 'text-emerald-700'
                            : rec.status === 'Sakit'
                            ? 'text-amber-700'
                            : rec.status === 'Izin'
                            ? 'text-sky-700'
                            : 'text-red-700'
                        }
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{rec.keterangan || '-'}</td>
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {rec.recorded_by_name || '-'}
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
