export type Peran = 'admin' | 'petugas' | 'dokter' | 'pasien'

export type StatusAntrian = 'menunggu' | 'dipanggil' | 'dilayani' | 'selesai' | 'batal'

export type Prioritas = 'darurat' | 'hamil' | 'difabel' | 'lansia' | 'reguler'

export interface Cabang {
  id: string
  kode: string
  nama: string
  kota: string
  alamat: string
  telepon: string
  warna: string
  aktif: boolean
}

export interface Poli {
  id: string
  kode: string
  nama: string
  deskripsi: string
  ruang: string
  lantai: string
  warna: string
  ikon: string
  rataLayanan: number
  cabangIds: string[]
  aktif: boolean
}

export interface Dokter {
  id: string
  nama: string
  spesialis: string
  sip: string
  poliId: string
  telepon: string
  email: string
  foto: string
  rating: number
  aktif: boolean
  bergabung: string
}

export interface Jadwal {
  id: string
  dokterId: string
  hari: number
  mulai: string
  selesai: string
  kuota: number
  cabangId: string
  aktif: boolean
}

export interface Antrian {
  id: string
  kode: string
  nomor: number
  poliId: string
  dokterId: string
  cabangId: string
  pasienId: string
  pasienNama: string
  telepon: string
  alasan: string
  prioritas: Prioritas
  status: StatusAntrian
  ambilPada: string
  dipanggilPada?: string
  dilayaniPada?: string
  selesaiPada?: string
  catatan?: string
  estimasiAwal: number
}

export interface JanjiTemu {
  id: string
  kode: string
  pasienId: string
  pasienNama: string
  dokterId: string
  poliId: string
  cabangId: string
  tanggal: string
  jam: string
  alasan: string
  status: 'menunggu' | 'dikonfirmasi' | 'selesai' | 'batal'
  dibuatPada: string
  antrianId?: string
}

export interface Pengguna {
  id: string
  nama: string
  email: string
  /** Hanya dikirim saat membuat/mengubah akun; respons API tidak pernah menyertakannya. */
  sandi?: string
  peran: Peran
  telepon: string
  nik?: string
  tanggalLahir?: string
  jenisKelamin?: 'L' | 'P'
  poliId?: string
  cabangId?: string
  avatar?: string
  aktif: boolean
  izinTambahan: string[]
  izinDicabut: string[]
  dibuatPada: string
  terakhirLogin?: string
}

export interface Notifikasi {
  id: string
  judul: string
  pesan: string
  tipe: 'info' | 'sukses' | 'peringatan' | 'panggilan'
  dibaca: boolean
  dibuatPada: string
  untukPenggunaId?: string
  tautan?: string
}

export interface AuditLog {
  id: string
  waktu: string
  aktorId: string
  aktorNama: string
  aktorPeran: Peran
  aksi: string
  entitas: string
  detail: string
  ip: string
}

export interface Pengaturan {
  namaRs: string
  jamBuka: string
  jamTutup: string
  suaraPanggilan: boolean
  notifikasiBrowser: boolean
  modeSimulasi: boolean
  selisihPanggilan: number
}

export interface DB {
  versi: number
  cabang: Cabang[]
  poli: Poli[]
  dokter: Dokter[]
  jadwal: Jadwal[]
  antrian: Antrian[]
  janjiTemu: JanjiTemu[]
  pengguna: Pengguna[]
  notifikasi: Notifikasi[]
  audit: AuditLog[]
  pengaturan: Pengaturan
}
