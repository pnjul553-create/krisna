export interface KompetensiDetail {
  kode: 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';
  nama: string;
  rumpun: string;
  rumpunNomor: string;
  ringkasan: string;
  deskripsi: string;
  kompetensiUtama: string[];
  fasilitasLab: string[];
  prospekKarir: string[];
  kelasContoh: string[];
  image: string;
}

export interface RumpunJurusan {
  nomor: string;
  nama: string;
  subjudul: string;
  deskripsi: string;
  image: string;
  kompetensi: Array<'TKJ' | 'DKV' | 'AK' | 'MPLB' | 'BC' | 'BD'>;
}

export const RUMPUN_JURUSAN: RumpunJurusan[] = [
  {
    nomor: '01',
    nama: 'Teknologi Informasi & Desain Kreatif',
    subjudul: 'Kompetensi TKJ & DKV',
    deskripsi:
      'Mempersiapkan teknisi infrastruktur jaringan, administrator server, serta desainer komunikasi visual yang terampil memadukan logika komputasi dengan estetika produk industri.',
    image: '/src/assets/images/jurusan_tech_lab_1795138399685.jpg',
    kompetensi: ['TKJ', 'DKV'],
  },
  {
    nomor: '02',
    nama: 'Akuntansi & Manajemen Perkantoran',
    subjudul: 'Kompetensi AK & MPLB',
    deskripsi:
      'Membentuk tenaga profesional tata kelola keuangan, perpajakan, audit dasar, serta administrasi perkantoran modern berbasis sistem informasi terpadu.',
    image: '/src/assets/images/hero_smk_campus_1795138399136.jpg',
    kompetensi: ['AK', 'MPLB'],
  },
  {
    nomor: '03',
    nama: 'Penyiaran Media & Bisnis Digital',
    subjudul: 'Kompetensi BC & BD',
    deskripsi:
      'Mengembangkan kreator produksi audio-visual, sutradara siaran, serta spesialis pemasaran digital dan niaga elektronik yang adaptif terhadap ekonomi kreatif.',
    image: '/src/assets/images/jurusan_broadcast_studio_1795138398795.jpg',
    kompetensi: ['BC', 'BD'],
  },
];

export const KOMPETENSI_DATA: Record<string, KompetensiDetail> = {
  TKJ: {
    kode: 'TKJ',
    nama: 'Teknik Komputer dan Jaringan',
    rumpun: 'Teknologi Informasi & Desain Kreatif',
    rumpunNomor: '01',
    ringkasan: 'Infrastruktur jaringan fiber optik, administrasi server Linux, keamanan siber, dan cloud computing.',
    deskripsi:
      'Program keahlian Teknik Komputer dan Jaringan (TKJ) SMK Prima Unggul berfokus pada perancangan, instalasi, konfigurasi, dan pemeliharaan infrastruktur jaringan skala korporasi maupun layanan komputasi awan.',
    kompetensiUtama: [
      'Instalasi & Terminasi Jaringan Fiber Optik (FTTH)',
      'Administrasi Server Linux, Virtualisasi & Container',
      'Routing, Switching & Manajemen MikroTik / Cisco',
      'Keamanan Jaringan & Monitoring Infrastruktur',
    ],
    fasilitasLab: [
      'Lab Infrastruktur Jaringan & Rack Server Terpadu',
      'Perangkat Router MikroTik & Switch Managed Kelas Industri',
      'Workshop Perakitan & Diagnostik Perangkat Keras',
    ],
    prospekKarir: [
      'Network Engineer',
      'System Administrator',
      'IT Support Specialist',
      'Cloud Infrastructure Technician',
    ],
    kelasContoh: ['X TKJ 1', 'XI TKJ 1', 'XII TKJ 1'],
    image: '/src/assets/images/jurusan_tech_lab_1795138399685.jpg',
  },
  DKV: {
    kode: 'DKV',
    nama: 'Desain Komunikasi Visual',
    rumpun: 'Teknologi Informasi & Desain Kreatif',
    rumpunNomor: '01',
    ringkasan: 'Identitas merek, ilustrasi digital, desain antarmuka (UI/UX), fotografi komersial, dan motion graphics.',
    deskripsi:
      'Desain Komunikasi Visual (DKV) mendidik siswa menjadi perancang pesan visual yang komunikatif dan strategis untuk media cetak maupun platform digital modern.',
    kompetensiUtama: [
      'Tipografi, Layout Editorial & Identitas Visual Merek',
      'Desain Antarmuka Pengguna (UI/UX) & Prototyping Digital',
      'Fotografi Produk, Pengolahan Citra & Ilustrasi Vektor',
      'Motion Graphics & Produksi Konten Kreatif',
    ],
    fasilitasLab: [
      'Studio Desain Grafis Dual-Monitor Terkalibrasi Warna',
      'Studio Fotografi Produk & Pencahayaan Softbox',
      'Pen Tablet & Perangkat Cetak Proofing',
    ],
    prospekKarir: [
      'Graphic Designer',
      'UI/UX Designer',
      'Brand Identity Specialist',
      'Creative Content Illustrator',
    ],
    kelasContoh: ['X DKV 1', 'XI DKV 1', 'XII DKV 1'],
    image: '/src/assets/images/jurusan_tech_lab_1795138399685.jpg',
  },
  AK: {
    kode: 'AK',
    nama: 'Akuntansi dan Keuangan Lembaga',
    rumpun: 'Akuntansi & Manajemen Perkantoran',
    rumpunNomor: '02',
    ringkasan: 'Siklus akuntansi perusahaan jasa, dagang, manufaktur, perpajakan, dan aplikasi akuntansi komputer.',
    deskripsi:
      'Kompetensi Keahlian Akuntansi dan Keuangan Lembaga (AK) membekali siswa ketelitian analisis laporan keuangan, kepatuhan perpajakan, serta penguasaan perangkat lunak akuntansi industri.',
    kompetensiUtama: [
      'Penyusunan Laporan Keuangan Standar SAK',
      'Komputerisasi Akuntansi (MYOB / Accurate / Spreadsheet)',
      'Administrasi Perpajakan & Pelaporan SPT',
      'Pengelolaan Kas, Piutang & Audit Dasar',
    ],
    fasilitasLab: [
      'Laboratorium Komputerisasi Akuntansi',
      'Bank Mini Sekolah untuk Simulasi Transaksi Nyata',
      'Perangkat Simulasi Pajak & Pembukuan Digital',
    ],
    prospekKarir: [
      'Junior Accountant',
      'Staf Pajak & Pembukuan',
      'Teller / Customer Service Perbankan',
      'Auditor Internal Junior',
    ],
    kelasContoh: ['X AK 1', 'XI AK 1', 'XII AK 1'],
    image: '/src/assets/images/hero_smk_campus_1795138399136.jpg',
  },
  MPLB: {
    kode: 'MPLB',
    nama: 'Manajemen Perkantoran dan Layanan Bisnis',
    rumpun: 'Akuntansi & Manajemen Perkantoran',
    rumpunNomor: '02',
    ringkasan: 'Korespondensi bisnis, kearsipan digital, manajemen rapat, layanan pelanggan, dan administrasi eksekutif.',
    deskripsi:
      'Manajemen Perkantoran dan Layanan Bisnis (MPLB) mencetak tenaga administrasi perkantoran profesional yang menguasai tata kelola dokumen digital, komunikasi korporat, dan manajemen operasional kantor.',
    kompetensiUtama: [
      'Manajemen Kearsipan Digital & Tata Persuratan Modern',
      'Administrasi Kepegawaian & Pengadaan Perkantoran',
      'Protokoler, Layanan Pelanggan & Humas Perusahaan',
      'Otomatisasi Aplikasi Perkantoran Terpadu',
    ],
    fasilitasLab: [
      'Ruang Simulasi Perkantoran Eksekutif',
      'Laboratorium Kearsipan & Resepsionis Korporat',
      'Perangkat Telekonferensi & Manajemen Dokumen',
    ],
    prospekKarir: [
      'Office Administrator',
      'Executive Secretary',
      'HR Administration Staff',
      'Customer Relations Officer',
    ],
    kelasContoh: ['X MPLB 1', 'XI MPLB 1', 'XII MPLB 1'],
    image: '/src/assets/images/hero_smk_campus_1795138399136.jpg',
  },
  BC: {
    kode: 'BC',
    nama: 'Broadcasting dan Perfilman',
    rumpun: 'Penyiaran Media & Bisnis Digital',
    rumpunNomor: '03',
    ringkasan: 'Produksi siaran televisi, sinematografi, tata suara, penulisan naskah, dan penyuntingan video profesional.',
    deskripsi:
      'Broadcasting dan Perfilman (BC) melatih siswa dalam seluruh alur produksi media audio-visual mulai dari praproduksi naskah, pengoperasian kamera sinema, tata cahaya studio, hingga pascaproduksi.',
    kompetensiUtama: [
      'Sinematografi, Tata Kamera & Pencahayaan Studio',
      'Penulisan Naskah Film, Dokumenter & Program Siaran',
      'Penyuntingan Video Non-Linear & Color Grading',
      'Tata Suara Studio & Manajemen Siaran Langsung',
    ],
    fasilitasLab: [
      'Studio Siaran & Ruang Kontrol Master (MCR)',
      'Kamera Sinema, Gimbal Stabilizer & Lighting Studio',
      'Ruang Editing Audio-Visual Kedap Suara',
    ],
    prospekKarir: [
      'Camera Operator & DOP',
      'Video Editor & Colorist',
      'Broadcast Producer',
      'Sound Engineer',
    ],
    kelasContoh: ['X BC 1', 'XI BC 1', 'XII BC 1'],
    image: '/src/assets/images/jurusan_broadcast_studio_1795138398795.jpg',
  },
  BD: {
    kode: 'BD',
    nama: 'Bisnis Digital',
    rumpun: 'Penyiaran Media & Bisnis Digital',
    rumpunNomor: '03',
    ringkasan: 'Strategi pemasaran digital, optimasi e-commerce, analitik penjualan, dan pengelolaan merek daring.',
    deskripsi:
      'Bisnis Digital (BD) membekali siswa keahlian kewirausahaan berbasis teknologi, manajemen toko daring, periklanan digital terukur, serta analisis perilaku konsumen modern.',
    kompetensiUtama: [
      'Manajemen Marketplace & Operasional E-Commerce',
      'Periklanan Digital, SEO & Pemasaran Media Sosial',
      'Copywriting Produk & Strategi Konversi Penjualan',
      'Analisis Data Penjualan & Pengelolaan Rantai Pasok',
    ],
    fasilitasLab: [
      'Digital Marketing Command Center',
      'Studio Live Commerce & Produksi Konten Produk',
      'Inkubator Bisnis Siswa SMK Prima Unggul',
    ],
    prospekKarir: [
      'Digital Marketing Specialist',
      'E-Commerce Store Manager',
      'Social Media Strategist',
      'Wirausaha Bisnis Digital',
    ],
    kelasContoh: ['X BD 1', 'XI BD 1', 'XII BD 1'],
    image: '/src/assets/images/jurusan_broadcast_studio_1795138398795.jpg',
  },
};

export const DAFTAR_KELAS = [
  'X TKJ 1',
  'XI TKJ 1',
  'XII TKJ 1',
  'X DKV 1',
  'XI DKV 1',
  'X AK 1',
  'XI AK 1',
  'X MPLB 1',
  'XI MPLB 1',
  'X BC 1',
  'XI BC 1',
  'X BD 1',
];

export const DAFTAR_JURUSAN = ['TKJ', 'DKV', 'AK', 'MPLB', 'BC', 'BD'] as const;
