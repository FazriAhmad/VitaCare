import type { Peran } from '@prisma/client'

export const IZIN_BAWAAN: Record<Peran, string[]> = {
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
