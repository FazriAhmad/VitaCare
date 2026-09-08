import type { Peran, Pengguna } from '@prisma/client'

export type Izin =
  | 'lihat_dashboard' | 'kelola_dokter' | 'kelola_poli' | 'kelola_jadwal' | 'kelola_cabang'
  | 'kelola_pengguna' | 'kelola_antrian' | 'panggil_antrian' | 'kelola_janji_temu' | 'lihat_statistik'
  | 'ekspor_laporan' | 'lihat_audit' | 'kirim_notifikasi' | 'ambil_nomor' | 'lihat_riwayat' | 'ubah_pengaturan'

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

type PenggunaIzin = Pick<Pengguna, 'peran' | 'izinTambahan' | 'izinDicabut'>

export function hitungIzin(u?: PenggunaIzin | null): Set<string> {
  const hasil = new Set<string>()
  if (!u) return hasil
  for (const i of IZIN_BAWAAN[u.peran]) if (!u.izinDicabut.includes(i)) hasil.add(i)
  for (const i of u.izinTambahan) hasil.add(i)
  return hasil
}

/** Sumber kebenaran izin — jangan percaya keputusan `boleh()` versi klien. */
export function boleh(u: PenggunaIzin | null | undefined, izin: Izin): boolean {
  if (!u) return false
  if (u.peran === 'admin' && !u.izinDicabut.includes(izin)) return true
  return hitungIzin(u).has(izin)
}
