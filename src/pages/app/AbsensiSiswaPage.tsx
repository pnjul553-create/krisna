import { useEffect, useState, useCallback } from 'react';
import { Check, Save, Search } from 'lucide-react';
import { apiFetch, getTodayInputDate } from '../../lib/api';
import { AbsensiSiswa, Siswa, StatusSiswa } from '../../types';

interface DraftAttendance {
  status: StatusSiswa;
  keterangan: string;
}

export default function AbsensiSiswaPage() {
  const [tanggal, setTanggal] = useState(getTodayInputDate());
  const [kelasFilter, setKelasFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [students, setStudents] = useState<Siswa[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftAttendance>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const [siswaRes, attRes] = await Promise.all([
        apiFetch<{ siswa: Siswa[] }>('/api/siswa'),
        apiFetch<{ records: AbsensiSiswa[] }>(`/api/absensi-siswa?tanggal=${encodeURIComponent(tanggal)}`),
      ]);

      setStudents(siswaRes.siswa);

      const attMap = new Map(attRes.records.map((r) => [r.siswa_id, r]));
      const nextDrafts: Record<string, DraftAttendance> = {};
      for (const s of siswaRes.siswa) {
        const existing = attMap.get(s.id);
        nextDrafts[s.id] = {
          status: existing?.status || 'Hadir',
          keterangan: existing?.keterangan || '',
        };
      }
      setDrafts(nextDrafts);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [tanggal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kelasOptions = Array.from(new Set(students.map((s) => s.kelas))).sort();

  const filteredStudents = students.filter((s) => {
    if (kelasFilter !== 'all' && s.kelas !== kelasFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
    }
    return true;
  });

  const updateDraft = (siswaId: string, patch: Partial<DraftAttendance>) => {
    setDrafts((prev) => ({
      ...prev,
      [siswaId]: {
        status: prev[siswaId]?.status || 'Hadir',
        keterangan: prev[siswaId]?.keterangan || '',
        ...patch,
      },
    }));
  };

  const setAllVisibleStatus = (status: StatusSiswa) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of filteredStudents) {
        next[s.id] = {
          status,
          keterangan: next[s.id]?.keterangan || '',
        };
      }
      return next;
    });
  };

  const handleSaveBulk = async () => {
    if (filteredStudents.length === 0) return;
    setSaving(true);
    setFeedback(null);
    try {
      const items = filteredStudents.map((s) => ({
        siswa_id: s.id,
        status: drafts[s.id]?.status || 'Hadir',
        keterangan: drafts[s.id]?.keterangan || '',
      }));

      const res = await apiFetch<{ ok: boolean; count: number }>('/api/absensi-siswa/bulk', {
        method: 'POST',
        body: JSON.stringify({ tanggal, items }),
      });

      setFeedback({
        type: 'success',
        text: `Berhasil menyimpan presensi ${res.count} siswa untuk tanggal ${tanggal}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const counts = filteredStudents.reduce(
    (acc, s) => {
      const st = drafts[s.id]?.status || 'Hadir';
      acc[st] += 1;
      return acc;
    },
    { Hadir: 0, Sakit: 0, Izin: 0, Alpha: 0 } as Record<StatusSiswa, number>
  );

  return (
    <div className="space-y-6">
      {/* Filter & Controls Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div>
              <label htmlFor="att-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Presensi
              </label>
              <input
                id="att-date"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div>
              <label htmlFor="att-kelas" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Filter Kelas
              </label>
              <select
                id="att-kelas"
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="all">Semua Kelas ({students.length} siswa)</option>
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="att-search" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cari NIS atau Nama
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="att-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari siswa..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAllVisibleStatus('Hadir')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-300 hover:border-red-300 hover:text-red-700 rounded-lg bg-white transition-colors whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tandai Semua Hadir</span>
            </button>

            <button
              type="button"
              disabled={saving || filteredStudents.length === 0}
              onClick={handleSaveBulk}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Absensi'}</span>
            </button>
          </div>
        </div>

        {/* Inline Tabular Count Summary */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-5 text-xs text-slate-600 tabular-nums">
          <span>
            Menampilkan <strong className="text-slate-950">{filteredStudents.length}</strong> siswa
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-700 font-semibold">Hadir: {counts.Hadir}</span>
          <span className="text-amber-700 font-semibold">Sakit: {counts.Sakit}</span>
          <span className="text-sky-700 font-semibold">Izin: {counts.Izin}</span>
          <span className="text-red-700 font-semibold">Alpha: {counts.Alpha}</span>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-lg border text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat daftar siswa...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada data siswa yang cocok dengan filter saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">NIS</th>
                  <th className="px-5 py-3">Nama Siswa</th>
                  <th className="px-5 py-3">Kelas</th>
                  <th className="px-5 py-3">Status Kehadiran</th>
                  <th className="px-5 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((siswa) => {
                  const current = drafts[siswa.id] || { status: 'Hadir', keterangan: '' };
                  return (
                    <tr key={siswa.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {siswa.nis}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {siswa.nama}
                      </td>
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{siswa.kelas}</td>
                      <td className="px-5 py-3">
                        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                          {(['Hadir', 'Sakit', 'Izin', 'Alpha'] as StatusSiswa[]).map((st) => {
                            const active = current.status === st;
                            let activeStyle = 'bg-white text-slate-900 shadow-sm';
                            if (active && st === 'Hadir') activeStyle = 'bg-emerald-700 text-white';
                            if (active && st === 'Sakit') activeStyle = 'bg-amber-600 text-white';
                            if (active && st === 'Izin') activeStyle = 'bg-sky-700 text-white';
                            if (active && st === 'Alpha') activeStyle = 'bg-red-700 text-white';

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateDraft(siswa.id, { status: st })}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                                  active ? activeStyle : 'text-slate-600 hover:text-slate-950'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={current.keterangan}
                          onChange={(e) => updateDraft(siswa.id, { keterangan: e.target.value })}
                          placeholder="Catatan opsional..."
                          className="w-full min-w-[160px] px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-700"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
