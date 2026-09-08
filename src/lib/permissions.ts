import type { Peran, Pengguna } from './types'

export type Izin =
  | 'lihat_dashboard'
  | 'kelola_dokter'
  | 'kelola_poli'
  | 'kelola_jadwal'
  | 'kelola_cabang'
  | 'kelola_pengguna'
  | 'kelola_antrian'
  | 'panggil_antrian'
  | 'kelola_janji_temu'
  | 'lihat_statistik'
  | 'ekspor_laporan'
  | 'lihat_audit'
  | 'kirim_notifikasi'
  | 'ambil_nomor'
  | 'lihat_riwayat'
  | 'ubah_pengaturan'

export const DAFTAR_IZIN: Array<{ id: Izin; label: string; grup: string }> = [
  { id: 'lihat_dashboard', label: 'Lihat dashboard ringkasan', grup: 'Umum' },
  { id: 'lihat_statistik', label: 'Lihat statistik & analitik', grup: 'Umum' },
  { id: 'lihat_riwayat', label: 'Lihat riwayat kunjungan', grup: 'Umum' },
  { id: 'kelola_antrian', label: 'Mengelola status antrian', grup: 'Operasional' },
  { id: 'panggil_antrian', label: 'Panggil nomor antrian', grup: 'Operasional' },
  { id: 'kelola_janji_temu', label: 'Mengelola janji temu', grup: 'Operasional' },
  { id: 'ambil_nomor', label: 'Ambil nomor antrian', grup: 'Operasional' },
  { id: 'kirim_notifikasi', label: 'Kirim notifikasi pasien', grup: 'Operasional' },
  { id: 'kelola_dokter', label: 'Kelola data dokter (CRUD)', grup: 'Master Data' },
  { id: 'kelola_poli', label: 'Kelola data poli (CRUD)', grup: 'Master Data' },
  { id: 'kelola_jadwal', label: 'Kelola jadwal praktik', grup: 'Master Data' },
  { id: 'kelola_cabang', label: 'Kelola multi cabang', grup: 'Master Data' },
  { id: 'kelola_pengguna', label: 'Kelola pengguna & peran', grup: 'Sistem' },
  { id: 'ekspor_laporan', label: 'Ekspor laporan (CSV / JSON)', grup: 'Sistem' },
  { id: 'lihat_audit', label: 'Melihat audit log', grup: 'Sistem' },
  { id: 'ubah_pengaturan', label: 'Mengubah pengaturan sistem', grup: 'Sistem' },
]

export const PERAN: Array<{ id: Peran; label: string; latar: string; deskripsi: string }> = [
  { id: 'admin', label: 'Administrator', latar: 'bg-brand-100 text-brand-700 ring-brand-200', deskripsi: 'Akses penuh: master data, perizinan, audit log, dan analitik.' },
  { id: 'petugas', label: 'Petugas Loket', latar: 'bg-blue-100 text-blue-700 ring-blue-200', deskripsi: 'Mengelola antrian, janji temu, dan pengambilan nomor di loket.' },
  { id: 'dokter', label: 'Dokter', latar: 'bg-amber-100 text-amber-700 ring-amber-200', deskripsi: 'Memanggil dan menangani antrian pada poli masing-masing.' },
  { id: 'pasien', label: 'Pasien', latar: 'bg-ink-100 text-ink-700 ring-ink-200', deskripsi: 'Mengambil nomor, janji temu, QR tiket, dan riwayat kunjungan.' },
]

export const IZIN_BAWAAN: Record<Peran, Izin[]> = {
  admin: [
    'lihat_dashboard', 'lihat_statistik', 'lihat_riwayat', 'kelola_antrian', 'panggil_antrian',
    'kelola_janji_temu', 'ambil_nomor', 'kirim_notifikasi', 'kelola_dokter', 'kelola_poli',
    'kelola_jadwal', 'kelola_cabang', 'kelola_pengguna', 'ekspor_laporan', 'lihat_audit', 'ubah_pengaturan',
  ],
  petugas: [
    'lihat_dashboard', 'lihat_statistik', 'lihat_riwayat', 'kelola_antrian', 'panggil_antrian',
    'kelola_janji_temu', 'ambil_nomor', 'kirim_notifikasi', 'ekspor_laporan',
  ],
  dokter: ['lihat_dashboard', 'lihat_statistik', 'lihat_riwayat', 'kelola_antrian', 'panggil_antrian'],
  pasien: ['ambil_nomor', 'lihat_riwayat'],
}

export function labelPeran(p: Peran): string {
  return PERAN.find((x) => x.id === p)?.label ?? p
}

export function labelIzin(i: string): string {
  return DAFTAR_IZIN.find((x) => x.id === i)?.label ?? i
}

export function hitungIzin(u?: Pengguna | null): Set<string> {
  const hasil = new Set<string>()
  if (!u) return hasil
  for (const i of IZIN_BAWAAN[u.peran]) if (!u.izinDicabut.includes(i)) hasil.add(i)
  for (const i of u.izinTambahan) hasil.add(i)
  return hasil
}

export function boleh(u: Pengguna | null | undefined, izin: Izin): boolean {
  if (!u) return false
  if (u.peran === 'admin' && !u.izinDicabut.includes(izin)) return true
  return hitungIzin(u).has(izin)
}
