import React, { useEffect, useState, useCallback } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, formatRoleLabel, formatShortDate } from '../../lib/api';
import { UserProfile, UserRole } from '../../types';

export default function UserManagementPage() {
  const { user: currentUser, provider } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Create/Edit State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Hard Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ users: UserProfile[] }>('/api/users');
      setUsers(res.users);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openAddModal = () => {
    setEditing(null);
    setFullName('');
    setEmail('');
    setNip('');
    setJabatan('');
    setRole('guru');
    setPassword('');
    setModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditing(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setNip(u.nip || '');
    setJabatan(u.jabatan || '');
    setRole(u.role);
    setPassword('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (editing) {
        await apiFetch(`/api/users/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            full_name: fullName,
            email,
            nip,
            jabatan,
            role,
            password: password.trim() || undefined,
          }),
        });
        setFeedback({
          type: 'success',
          text: `Data pengguna ${fullName} berhasil diperbarui dan disinkronkan.`,
        });
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email,
            nip,
            jabatan,
            role,
            password,
          }),
        });
        setFeedback({
          type: 'success',
          text: `Pengguna baru ${fullName} berhasil ditambahkan dan disinkronkan ke autentikasi.`,
        });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleHardDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await apiFetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      setFeedback({
        type: 'success',
        text: `Akun ${deleteTarget.full_name} berhasil dihapus permanen (hard delete) dari sistem autentikasi.`,
      });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nip || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, atau NIP..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
          >
            <option value="all">Semua Peran ({users.length})</option>
            <option value="admin">Admin</option>
            <option value="guru">Guru</option>
            <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-700 hover:bg-red-800 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
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
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
          <span>
            Sinkronisasi Autentikasi:{' '}
            <strong className="text-slate-900">
              {provider === 'supabase' ? 'Supabase Authentication' : 'Autentikasi Lokal Terpadu'}
            </strong>
          </span>
          <span className="tabular-nums">Total: {filtered.length} pengguna</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat daftar pengguna...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada pengguna yang cocok dengan filter pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Nama &amp; Email</th>
                  <th className="px-6 py-3">NIP</th>
                  <th className="px-6 py-3">Jabatan</th>
                  <th className="px-6 py-3">Peran</th>
                  <th className="px-6 py-3">Terdaftar</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3">
                        <div className="font-semibold text-slate-900">{u.full_name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {u.nip || '-'}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{u.jabatan || '-'}</td>
                      <td className="px-6 py-3 font-semibold whitespace-nowrap">
                        <span
                          className={
                            u.role === 'admin'
                              ? 'text-red-700'
                              : u.role === 'guru'
                              ? 'text-slate-900'
                              : 'text-slate-600'
                          }
                        >
                          {formatRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatShortDate(u.created_at.slice(0, 10))}
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                            aria-label={`Edit ${u.full_name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            title={
                              isSelf
                                ? 'Akun yang sedang aktif tidak dapat dihapus'
                                : 'Hard delete hingga ke autentikasi'
                            }
                            className="p-1.5 text-slate-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-red-50 transition-colors"
                            aria-label={`Hapus ${u.full_name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-950">
                {editing ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Autentikasi
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@smkprimaunggul.sch.id"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Peran (Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-700"
                  >
                    <option value="admin">Admin</option>
                    <option value="guru">Guru</option>
                    <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Nomor induk pegawai"
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jabatan / Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Contoh: Guru Produktif DKV"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {editing ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
                </label>
                <input
                  type="password"
                  required={!editing}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? 'Isi hanya jika ingin mengganti kata sandi' : 'Minimal 6 karakter'}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700"
                />
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
                  {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-950">
              Hapus Pengguna Secara Permanen (Hard Delete)?
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Akun <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email}) akan dihapus
              permanen hingga ke sistem autentikasi beserta seluruh catatan absensinya. Tindakan ini
              tidak dapat dibatalkan.
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
                onClick={handleHardDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hard Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
