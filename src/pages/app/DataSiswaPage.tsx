import React, { useEffect, useState, useCallback } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { DAFTAR_JURUSAN, DAFTAR_KELAS } from '../../data/schoolData';
import { apiFetch } from '../../lib/api';
import { Siswa } from '../../types';

export default function DataSiswaPage() {
  const [students, setStudents] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [kelasFilter, setKelasFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Siswa | null>(null);
  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState(DAFTAR_KELAS[0]);
  const [jurusan, setJurusan] = useState<string>('TKJ');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Siswa | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ siswa: Siswa[] }>('/api/siswa');
      setStudents(res.siswa);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const openAddModal = () => {
    setEditing(null);
    setNis('');
    setNama('');
    setKelas('X TKJ 1');
    setJurusan('TKJ');
    setModalOpen(true);
  };

  const openEditModal = (s: Siswa) => {
    setEditing(s);
    setNis(s.nis);
    setNama(s.nama);
    setKelas(s.kelas);
    setJurusan(s.jurusan);
    setModalOpen(true);
  };

  const handleKelasChange = (val: string) => {
    setKelas(val);
    const matched = DAFTAR_JURUSAN.find((j) => val.toUpperCase().includes(j));
    if (matched) setJurusan(matched);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (editing) {
        await apiFetch(`/api/siswa/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ nis, nama, kelas, jurusan }),
        });
        setFeedback({ type: 'success', text: `Data siswa ${nama} berhasil diperbarui.` });
      } else {
        await apiFetch('/api/siswa', {
          method: 'POST',
          body: JSON.stringify({ nis, nama, kelas, jurusan }),
        });
        setFeedback({ type: 'success', text: `Siswa baru ${nama} berhasil ditambahkan.` });
      }
      setModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await apiFetch(`/api/siswa/${deleteTarget.id}`, { method: 'DELETE' });
      setFeedback({ type: 'success', text: `Data siswa ${deleteTarget.nama} telah dihapus.` });
      setDeleteTarget(null);
      await loadStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const kelasOptions = Array.from(new Set(students.map((s) => s.kelas))).sort();

  const filtered = students.filter((s) => {
    if (kelasFilter !== 'all' && s.kelas !== kelasFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NIS atau nama siswa..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
            />
          </div>
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
          >
            <option value="all">Semua Kelas ({students.length})</option>
            {kelasOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Siswa</span>
        </button>
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat data siswa...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada data siswa yang sesuai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">NIS</th>
                  <th className="px-6 py-3">Nama Lengkap</th>
                  <th className="px-6 py-3">Kelas</th>
                  <th className="px-6 py-3">Jurusan</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {s.nis}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {s.nama}
                    </td>
                    <td className="px-6 py-3 text-slate-700 whitespace-nowrap">{s.kelas}</td>
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-red-700 whitespace-nowrap">
                      {s.jurusan}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                          aria-label={`Edit ${s.nama}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                          aria-label={`Hapus ${s.nama}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-950">
                {editing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIS</label>
                <input
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 24251007"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap siswa"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kelas</label>
                  <input
                    type="text"
                    required
                    list="kelas-suggestions"
                    value={kelas}
                    onChange={(e) => handleKelasChange(e.target.value)}
                    placeholder="Contoh: X TKJ 1"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                  <datalist id="kelas-suggestions">
                    {DAFTAR_KELAS.map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jurusan</label>
                  <select
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
                  >
                    {DAFTAR_JURUSAN.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-slate-950">Hapus Data Siswa?</h3>
            <p className="text-sm text-slate-600 mt-2">
              Siswa <strong>{deleteTarget.nama}</strong> ({deleteTarget.nis}) dan riwayat
              absensinya akan dihapus secara permanen.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg"
              >
                {deleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
