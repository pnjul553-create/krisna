export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nip: string | null;
  jabatan: string | null;
  role: UserRole;
  created_at: string;
}

export interface Siswa {
  id: string;
  nis: string;
  nama: string;
  kelas_id?: string;
  kelas: string;
  jurusan_id?: string;
  jurusan: string;
  created_at: string;
}

export type StatusKaryawan = 'Hadir' | 'Izin' | 'Sakit' | 'Dinas Luar';
export type StatusSiswa = 'Hadir' | 'Sakit' | 'Izin' | 'Alpha';

export interface AbsensiKaryawan {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  nip?: string | null;
  role?: UserRole;
  tanggal: string;
  status: StatusKaryawan;
  waktu_masuk: string | null;
  waktu_pulang: string | null;
  catatan: string | null;
  created_at: string;
}

export interface AbsensiSiswa {
  id: string;
  siswa_id: string;
  nis?: string;
  nama_siswa?: string;
  kelas?: string;
  jurusan?: string;
  tanggal: string;
  status: StatusSiswa;
  keterangan: string | null;
  recorded_by: string | null;
  recorded_by_name?: string | null;
  created_at: string;
}

export interface DashboardSummary {
  today: string;
  totalSiswa: number;
  totalKaryawan: number;
  karyawanHadirHariIni: number;
  karyawanIzinSakitHariIni: number;
  siswaHadirHariIni: number;
  siswaSakitHariIni: number;
  siswaIzinHariIni: number;
  siswaAlphaHariIni: number;
  siswaBelumDiabsen: number;
  myAttendanceToday: AbsensiKaryawan | null;
  recentKaryawanAttendance: AbsensiKaryawan[];
  kelasRekapHariIni: Array<{
    kelas: string;
    total: number;
    hadir: number;
    sakit: number;
    izin: number;
    alpha: number;
  }>;
}
