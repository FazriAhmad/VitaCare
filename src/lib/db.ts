import { useSyncExternalStore } from 'react'
import type { Antrian, AuditLog, Cabang, DB, Dokter, JanjiTemu, Jadwal, Notifikasi, Pengaturan, Pengguna, Peran, Poli, Prioritas, StatusAntrian } from './types'
import { seedDB } from './seed'
import { realtime, siarkanSinkron } from './realtime'
import { IZIN_BAWAAN } from './permissions'
import { hariIniISO, jam, pad2, uid } from './utils'

const KUNCI = 'vitacare.db.v3'
const KUNCI_SESI = 'vitacare.sesi.v3'
const VERSI = 3

/* ------------------------------------------------------------------ muat */

function muat(): DB {
  try {
    const kasar = localStorage.getItem(KUNCI)
    if (kasar) {
      const t = JSON.parse(kasar) as DB
      if (t && t.versi === VERSI && Array.isArray(t.poli)) return t
    }
  } catch {
    /* rusak -> benih ulang */
  }
  const baru = seedDB()
  simpan(baru)
  return baru
}

function simpan(db: DB) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(db))
  } catch {
    /* kuota penuh */
  }
}

let data: DB = muat()
let sesiId: string | null = null
try {
  sesiId = localStorage.getItem(KUNCI_SESI)
} catch {
  sesiId = null
}

const pendengar = new Set<() => void>()
const pendengarSesi = new Set<() => void>()

function getSnapshot(): DB {
  return data
}

function sebar() {
  pendengar.forEach((f) => f())
}

function sebarSesi() {
  pendengarSesi.forEach((f) => f())
}

export function langgan(f: () => void) {
  pendengar.add(f)
  return () => {
    pendengar.delete(f)
  }
}

export function langganSesi(f: () => void) {
  pendengarSesi.add(f)
  return () => {
    pendengarSesi.delete(f)
  }
}

export function getDB(): DB {
  return data
}

export function pakaiDB(): DB {
  return useSyncExternalStore(langgan, getSnapshot, getSnapshot)
}

export function pakaiPenggunaSesi(): Pengguna | null {
  useSyncExternalStore(langganSesi, getSnapshot, getSnapshot)
  if (!sesiId) return null
  return data.pengguna.find((p) => p.id === sesiId) ?? null
}

/** Terapkan perubahan, simpan, dan siarkan ke tab lain (realtime). */
function ubah(mutator: (db: DB) => DB, opsi: { senyap?: boolean } = {}) {
  data = mutator(data)
  simpan(data)
  sebar()
  if (!opsi.senyap) siarkanSinkron(sesiId ?? 'tamu')
}

realtime.langgan((p) => {
  if (p.jenis === 'sinkron') {
    data = muat()
    sebar()
    sebarSesi()
  }
})

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KUNCI) {
      data = muat()
      sebar()
      sebarSesi()
    }
  })
}

/* ----------------------------------------------------------------- audit */

function catat(aksi: string, entitas: string, detail: string) {
  const aktor = data.pengguna.find((p) => p.id === sesiId)
  const log: AuditLog = {
    id: uid('aud'),
    waktu: new Date().toISOString(),
    aktorId: aktor?.id ?? 'tamu',
    aktorNama: aktor?.nama ?? 'Tamu / Kiosk',
    aktorPeran: aktor?.peran ?? 'pasien',
    aksi,
    entitas,
    detail,
    ip: `10.10.${Math.floor(Math.random() * 8) + 2}.${Math.floor(Math.random() * 240) + 8}`,
  }
  ubah((db) => ({ ...db, audit: [log, ...db.audit].slice(0, 600) }), { senyap: true })
}

export function beriNotifikasi(n: Omit<Notifikasi, 'id' | 'dibaca' | 'dibuatPada'>) {
  const baru: Notifikasi = { ...n, id: uid('ntf'), dibaca: false, dibuatPada: new Date().toISOString() }
  ubah((db) => ({ ...db, notifikasi: [baru, ...db.notifikasi].slice(0, 120) }), { senyap: true })

  if (data.pengaturan.notifikasiBrowser && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(n.judul, { body: n.pesan, icon: '/favicon.svg' })
    } catch {
      /* ditolak peramban */
    }
  }
  return baru
}

/* --------------------------------------------------------------- autentik */

export function masuk(email: string, sandi: string): { ok: boolean; pesan: string } {
  const u = data.pengguna.find((p) => p.email.toLowerCase() === email.trim().toLowerCase())
  if (!u) return { ok: false, pesan: 'Email tidak terdaftar.' }
  if (u.sandi !== sandi) return { ok: false, pesan: 'Kata sandi salah. Coba lagi.' }
  if (!u.aktif) return { ok: false, pesan: 'Akun Anda dinonaktifkan. Hubungi admin.' }
  sesiId = u.id
  try {
    localStorage.setItem(KUNCI_SESI, u.id)
  } catch { /* abaikan */ }
  ubah((db) => ({
    ...db,
    pengguna: db.pengguna.map((p) => (p.id === u.id ? { ...p, terakhirLogin: new Date().toISOString() } : p)),
  }), { senyap: true })
  catat('MASUK', 'Sesi', `${u.nama} masuk sebagai ${u.peran}`)
  sebarSesi()
  return { ok: true, pesan: `Selamat datang, ${u.nama.split(',')[0]}!` }
}

export function daftar(dataBaru: { nama: string; email: string; sandi: string; telepon: string; nik?: string; cabangId: string }): { ok: boolean; pesan: string } {
  const email = dataBaru.email.trim().toLowerCase()
  if (data.pengguna.some((p) => p.email.toLowerCase() === email)) {
    return { ok: false, pesan: 'Email sudah terdaftar. Gunakan email lain.' }
  }
  const baru: Pengguna = {
    id: uid('pgu'),
    nama: dataBaru.nama.trim(),
    email,
    sandi: dataBaru.sandi,
    peran: 'pasien',
    telepon: dataBaru.telepon,
    nik: dataBaru.nik,
    cabangId: dataBaru.cabangId,
    aktif: true,
    izinTambahan: [],
    izinDicabut: [],
    dibuatPada: new Date().toISOString(),
  }
  ubah((db) => ({ ...db, pengguna: [...db.pengguna, baru] }), { senyap: true })
  sesiId = baru.id
  try {
    localStorage.setItem(KUNCI_SESI, baru.id)
  } catch { /* abaikan */ }
  catat('DAFTAR', 'Pengguna', `Pendaftaran akun pasien ${baru.nama}`)
  beriNotifikasi({ judul: 'Akun berhasil dibuat', pesan: `Selamat datang di VitaCare, ${baru.nama}. Anda dapat langsung mengambil nomor antrian.`, tipe: 'sukses' })
  sebarSesi()
  return { ok: true, pesan: 'Pendaftaran berhasil!' }
}

export function keluar() {
  const u = data.pengguna.find((p) => p.id === sesiId)
  if (u) catat('KELUAR', 'Sesi', `${u.nama} keluar dari sistem`)
  sesiId = null
  try {
    localStorage.removeItem(KUNCI_SESI)
  } catch { /* abaikan */ }
  sebarSesi()
}

/* --------------------------------------------------------------- selector */

export const cariPoli = (db: DB, id: string) => db.poli.find((p) => p.id === id)
export const cariDokter = (db: DB, id: string) => db.dokter.find((d) => d.id === id)
export const cariCabang = (db: DB, id: string) => db.cabang.find((c) => c.id === id)

export const BOBOT: Record<Prioritas, number> = { darurat: 0, hamil: 1, difabel: 2, lansia: 3, reguler: 4 }

export const LABEL_PRIORITAS: Record<Prioritas, { label: string; latar: string; titik: string }> = {
  darurat: { label: 'Darurat', latar: 'bg-rose-100 text-rose-700 ring-rose-200', titik: 'bg-rose-500' },
  hamil: { label: 'Ibu Hamil', latar: 'bg-pink-100 text-pink-700 ring-pink-200', titik: 'bg-pink-500' },
  difabel: { label: 'Difabel', latar: 'bg-violet-100 text-violet-700 ring-violet-200', titik: 'bg-violet-500' },
  lansia: { label: 'Lansia', latar: 'bg-amber-100 text-amber-800 ring-amber-200', titik: 'bg-amber-500' },
  reguler: { label: 'Reguler', latar: 'bg-ink-100 text-ink-600 ring-ink-200', titik: 'bg-ink-400' },
}

export const LABEL_STATUS: Record<StatusAntrian, { label: string; latar: string }> = {
  menunggu: { label: 'Menunggu', latar: 'bg-ink-100 text-ink-700 ring-ink-200' },
  dipanggil: { label: 'Dipanggil', latar: 'bg-blue-100 text-blue-700 ring-blue-200' },
  dilayani: { label: 'Dilayani', latar: 'bg-amber-100 text-amber-800 ring-amber-200' },
  selesai: { label: 'Selesai', latar: 'bg-brand-100 text-brand-700 ring-brand-200' },
  batal: { label: 'Batal', latar: 'bg-rose-100 text-rose-700 ring-rose-200' },
}

export function urutAntrian(a: Antrian, b: Antrian): number {
  const bobot = BOBOT[a.prioritas] - BOBOT[b.prioritas]
  if (bobot !== 0) return bobot
  return new Date(a.ambilPada).getTime() - new Date(b.ambilPada).getTime()
}

export function antrianAktif(db: DB, cabangId?: string): Antrian[] {
  return db.antrian
    .filter((a) => a.status !== 'selesai' && a.status !== 'batal' && (!cabangId || a.cabangId === cabangId))
    .sort(urutAntrian)
}

export function antreanPoli(db: DB, poliId: string, cabangId?: string): Antrian[] {
  return db.antrian
    .filter((a) => a.poliId === poliId && a.status !== 'selesai' && a.status !== 'batal' && (!cabangId || a.cabangId === cabangId))
    .sort(urutAntrian)
}

export function panggilanTerakhir(db: DB, cabangId?: string): Antrian | null {
  const daftar = db.antrian
    .filter((a) => a.dipanggilPada && (a.status === 'dipanggil' || a.status === 'dilayani') && (!cabangId || a.cabangId === cabangId))
    .sort((a, b) => new Date(b.dipanggilPada!).getTime() - new Date(a.dipanggilPada!).getTime())
  return daftar[0] ?? null
}

export function nomorBaru(db: DB, poliId: string, cabangId: string): number {
  const hari = hariIniISO()
  const jumlah = db.antrian.filter(
    (a) => a.poliId === poliId && a.cabangId === cabangId && a.ambilPada.slice(0, 10) === hari,
  ).length
  return jumlah + 1
}

/* ---------------------------------------------------------------- antrian */

export function ambilNomor(input: {
  poliId: string
  cabangId: string
  dokterId?: string
  nama: string
  telepon: string
  alasan: string
  prioritas: Prioritas
  pasienId?: string
}): Antrian {
  const db = data
  const poli = cariPoli(db, input.poliId)!
  const nomor = nomorBaru(db, input.poliId, input.cabangId)
  const dokterAktif = input.dokterId ?? dokterPraktik(db, input.poliId, input.cabangId)?.id ?? db.dokter[0].id
  const antrian: Antrian = {
    id: uid('antrian'),
    kode: `${poli.kode}-${pad2(nomor)}`,
    nomor,
    poliId: poli.id,
    dokterId: dokterAktif,
    cabangId: input.cabangId,
    pasienId: input.pasienId ?? '',
    pasienNama: input.nama.trim(),
    telepon: input.telepon,
    alasan: input.alasan,
    prioritas: input.prioritas,
    status: 'menunggu',
    ambilPada: new Date().toISOString(),
    estimasiAwal: estimasiDasar(db, poli.id, input.cabangId),
  }
  ubah((d) => ({ ...d, antrian: [...d.antrian, antrian] }), { senyap: true })
  catat('AMBIL_NOMOR', 'Antrian', `Nomor ${antrian.kode} untuk ${antrian.pasienNama} di ${poli.nama}`)
  beriNotifikasi({
    judul: `Nomor antrian ${antrian.kode}`,
    pesan: `Anda terdaftar di ${poli.nama}. Estimasi tunggu ±${antrian.estimasiAwal} menit. Tunjukkan QR saat dipanggil.`,
    tipe: 'info',
    tautan: `/status?kode=${antrian.kode}`,
  })
  return antrian
}

function estimasiDasar(db: DB, poliId: string, cabangId: string): number {
  const poli = cariPoli(db, poliId)
  const antre = antreanPoli(db, poliId, cabangId).length
  return Math.max(2, Math.round(antre * (poli?.rataLayanan ?? 6) * 0.8))
}

export function dokterPraktik(db: DB, poliId: string, cabangId: string): Dokter | undefined {
  const hari = new Date().getDay()
  const dokterPoli = db.dokter.filter((d) => d.poliId === poliId && d.aktif)
  for (const d of dokterPoli) {
    const jad = db.jadwal.find((j) => j.dokterId === d.id && j.hari === hari && j.cabangId === cabangId && j.aktif)
    if (jad) return d
  }
  return dokterPoli[0]
}

function suaraPanggilan(kode: string, poliNama: string) {
  if (!data.pengaturan.suaraPanggilan) return
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const os = ctx.createOscillator()
    const gain = ctx.createGain()
    os.type = 'sine'
    os.frequency.setValueAtTime(880, ctx.currentTime)
    os.frequency.setValueAtTime(1180, ctx.currentTime + 0.22)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.75)
    os.connect(gain)
    gain.connect(ctx.destination)
    os.start()
    os.stop(ctx.currentTime + 0.8)
    setTimeout(() => ctx.close(), 1200)
  } catch {
    /* audio tidak tersedia */
  }
  try {
    const u = new SpeechSynthesisUtterance(`Nomor antrian ${kode.split('-').join(' ')}. Silakan menuju ${poliNama}.`)
    u.lang = 'id-ID'
    u.rate = 0.92
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* sintesis suara tidak tersedia */
  }
}

export function panggilAntrian(id: string): Antrian | null {
  const target = data.antrian.find((a) => a.id === id)
  if (!target) return null
  const poli = cariPoli(data, target.poliId)
  const waktu = new Date().toISOString()
  ubah((db) => ({
    ...db,
    antrian: db.antrian.map((a) => (a.id === id ? { ...a, status: 'dipanggil' as StatusAntrian, dipanggilPada: waktu } : a)),
  }), { senyap: true })
  catat('PANGGIL_ANTRIAN', 'Antrian', `Memanggil ${target.kode} ke ${poli?.ruang ?? '-'}`)
  beriNotifikasi({
    judul: `Nomor ${target.kode} dipanggil`,
    pesan: `Silakan menuju ${poli?.nama ?? 'poli'} — ${poli?.ruang ?? ''}.`,
    tipe: 'panggilan',
    untukPenggunaId: target.pasienId || undefined,
    tautan: `/status?kode=${target.kode}`,
  })
  suaraPanggilan(target.kode, poli?.nama ?? 'poli')
  return { ...target, status: 'dipanggil', dipanggilPada: waktu }
}

export function panggilBerikutnya(poliId: string, cabangId: string): Antrian | null {
  const berikut = antreanPoli(data, poliId, cabangId).find((a) => a.status === 'menunggu')
  if (!berikut) return null
  return panggilAntrian(berikut.id)
}

export function ubahStatusAntrian(id: string, status: StatusAntrian, catatan?: string) {
  const waktu = new Date().toISOString()
  const target = data.antrian.find((a) => a.id === id)
  if (!target) return
  ubah((db) => ({
    ...db,
    antrian: db.antrian.map((a) => {
      if (a.id !== id) return a
      const baru: Antrian = { ...a, status }
      if (status === 'dilayani') baru.dilayaniPada = waktu
      if (status === 'selesai') {
        baru.selesaiPada = waktu
        baru.dilayaniPada = a.dilayaniPada ?? waktu
        baru.dipanggilPada = a.dipanggilPada ?? waktu
      }
      if (catatan !== undefined) baru.catatan = catatan
      return baru
    }),
  }), { senyap: true })
  catat('UBAH_STATUS', 'Antrian', `${target.kode} -> ${status}${catatan ? ` (${catatan})` : ''}`)
}

export function ubahPrioritas(id: string, prioritas: Prioritas) {
  const target = data.antrian.find((a) => a.id === id)
  if (!target) return
  ubah((db) => ({
    ...db,
    antrian: db.antrian.map((a) => (a.id === id ? { ...a, prioritas } : a)),
  }), { senyap: true })
  catat('UBAH_PRIORITAS', 'Antrian', `${target.kode} diubah ke prioritas ${prioritas}`)
  beriNotifikasi({ judul: 'Prioritas diperbarui', pesan: `Antrian ${target.kode} kini berstatus prioritas ${prioritas}.`, tipe: 'peringatan', untukPenggunaId: target.pasienId || undefined })
}

export function pindahkanCabang(id: string, cabangId: string) {
  const target = data.antrian.find((a) => a.id === id)
  if (!target) return
  const nomor = nomorBaru(data, target.poliId, cabangId)
  const poli = cariPoli(data, target.poliId)
  ubah((db) => ({
    ...db,
    antrian: db.antrian.map((a) => (a.id === id ? { ...a, cabangId, nomor, kode: `${poli?.kode ?? 'AN'}-${pad2(nomor)}` } : a)),
  }), { senyap: true })
  catat('PINDAH_CABANG', 'Antrian', `${target.kode} dipindahkan ke cabang ${cariCabang(data, cabangId)?.nama}`)
}

export function resetAntrianHarian(cabangId: string) {
  ubah((db) => ({ ...db, antrian: db.antrian.filter((a) => a.cabangId !== cabangId || a.ambilPada.slice(0, 10) !== hariIniISO()) }))
  catat('RESET_ANTRIAN', 'Antrian', `Mereset antrian harian cabang ${cariCabang(data, cabangId)?.nama}`)
}

/* --------------------------------------------------------------- janji temu */

export function buatJanjiTemu(input: { pasienId: string; dokterId: string; tanggal: string; jam: string; alasan: string; cabangId: string }): JanjiTemu {
  const pasien = data.pengguna.find((p) => p.id === input.pasienId)
  const dokter = cariDokter(data, input.dokterId)!
  const baru: JanjiTemu = {
    id: uid('jt'),
    kode: `JT-${Math.floor(1000 + Math.random() * 8999)}`,
    pasienId: input.pasienId,
    pasienNama: pasien?.nama ?? 'Pasien',
    dokterId: dokter.id,
    poliId: dokter.poliId,
    cabangId: input.cabangId,
    tanggal: input.tanggal,
    jam: input.jam,
    alasan: input.alasan,
    status: 'menunggu',
    dibuatPada: new Date().toISOString(),
  }
  ubah((db) => ({ ...db, janjiTemu: [baru, ...db.janjiTemu] }), { senyap: true })
  catat('BUAT_JANJI_TEMU', 'Janji Temu', `${baru.kode} dengan ${dokter.nama} pada ${baru.tanggal} ${baru.jam}`)
  beriNotifikasi({ judul: 'Janji temu dibuat', pesan: `Janji temu ${baru.kode} bersama ${dokter.nama} pada ${baru.tanggal} pukul ${baru.jam}.`, tipe: 'sukses', untukPenggunaId: baru.pasienId })
  return baru
}

export function statusJanjiTemu(id: string, status: JanjiTemu['status']) {
  const target = data.janjiTemu.find((j) => j.id === id)
  if (!target) return
  ubah((db) => ({
    ...db,
    janjiTemu: db.janjiTemu.map((j) => (j.id === id ? { ...j, status } : j)),
  }), { senyap: true })
  catat('UBAH_JANJI_TEMU', 'Janji Temu', `${target.kode} -> ${status}`)
  beriNotifikasi({ judul: `Janji temu ${status}`, pesan: `Janji temu ${target.kode} Anda telah ${status}.`, tipe: status === 'batal' ? 'peringatan' : 'info', untukPenggunaId: target.pasienId })
}

export function janjiTemuKeAntrian(id: string): Antrian | null {
  const jt = data.janjiTemu.find((j) => j.id === id)
  if (!jt) return null
  const antrian = ambilNomor({
    poliId: jt.poliId,
    cabangId: jt.cabangId,
    dokterId: jt.dokterId,
    nama: jt.pasienNama,
    telepon: data.pengguna.find((p) => p.id === jt.pasienId)?.telepon ?? '-',
    alasan: jt.alasan,
    prioritas: 'reguler',
    pasienId: jt.pasienId,
  })
  ubah((db) => ({
    ...db,
    janjiTemu: db.janjiTemu.map((j) => (j.id === id ? { ...j, status: 'selesai' as const, antrianId: antrian.id } : j)),
  }), { senyap: true })
  return antrian
}

/* ------------------------------------------------------------- master data */

function ubahPoli(poli: Poli, aksi: 'TAMBAH' | 'UBAH' | 'HAPUS') {
  ubah((db) => ({
    ...db,
    poli: aksi === 'TAMBAH' ? [...db.poli, poli] : aksi === 'UBAH' ? db.poli.map((p) => (p.id === poli.id ? poli : p)) : db.poli.filter((p) => p.id !== poli.id),
  }))
  catat(`${aksi}_POLI`, 'Poli', `${aksi === 'HAPUS' ? 'Menghapus' : aksi === 'UBAH' ? 'Mengubah' : 'Menambah'} poli ${poli.nama}`)
}

export function simpanPoli(poli: Poli) {
  const ada = data.poli.some((p) => p.id === poli.id)
  ubahPoli(poli, ada ? 'UBAH' : 'TAMBAH')
}
export function hapusPoli(id: string) {
  const p = data.poli.find((x) => x.id === id)
  if (!p) return
  ubahPoli(p, 'HAPUS')
}

function ubahDokter(dokter: Dokter, aksi: 'TAMBAH' | 'UBAH' | 'HAPUS') {
  ubah((db) => ({
    ...db,
    dokter: aksi === 'TAMBAH' ? [...db.dokter, dokter] : aksi === 'UBAH' ? db.dokter.map((d) => (d.id === dokter.id ? dokter : d)) : db.dokter.filter((d) => d.id !== dokter.id),
  }))
  catat(`${aksi}_DOKTER`, 'Dokter', `${aksi === 'HAPUS' ? 'Menghapus' : aksi === 'UBAH' ? 'Mengubah' : 'Menambah'} dokter ${dokter.nama}`)
}

export function simpanDokter(dokter: Dokter) {
  const ada = data.dokter.some((d) => d.id === dokter.id)
  ubahDokter(dokter, ada ? 'UBAH' : 'TAMBAH')
}
export function hapusDokter(id: string) {
  const d = data.dokter.find((x) => x.id === id)
  if (!d) return
  ubahDokter(d, 'HAPUS')
}

export function simpanJadwal(jadwal: Jadwal) {
  const ada = data.jadwal.some((j) => j.id === jadwal.id)
  ubah((db) => ({
    ...db,
    jadwal: ada ? db.jadwal.map((j) => (j.id === jadwal.id ? jadwal : j)) : [...db.jadwal, jadwal],
  }))
  catat(ada ? 'UBAH_JADWAL' : 'TAMBAH_JADWAL', 'Jadwal', `${cariDokter(data, jadwal.dokterId)?.nama} hari ${jadwal.hari} ${jadwal.mulai}-${jadwal.selesai}`)
}
export function hapusJadwal(id: string) {
  ubah((db) => ({ ...db, jadwal: db.jadwal.filter((j) => j.id !== id) }))
  catat('HAPUS_JADWAL', 'Jadwal', 'Menghapus satu slot jadwal praktik')
}

export function simpanCabang(cabang: Cabang) {
  const ada = data.cabang.some((c) => c.id === cabang.id)
  ubah((db) => ({
    ...db,
    cabang: ada ? db.cabang.map((c) => (c.id === cabang.id ? cabang : c)) : [...db.cabang, cabang],
  }))
  catat(ada ? 'UBAH_CABANG' : 'TAMBAH_CABANG', 'Cabang', cabang.nama)
}
export function hapusCabang(id: string) {
  ubah((db) => ({ ...db, cabang: db.cabang.filter((c) => c.id !== id) }))
  catat('HAPUS_CABANG', 'Cabang', `Menghapus cabang ${cariCabang(data, id)?.nama}`)
}

/* --------------------------------------------------------------- pengguna */

export function simpanPengguna(p: Pengguna) {
  const ada = data.pengguna.some((x) => x.id === p.id)
  ubah((db) => ({
    ...db,
    pengguna: ada ? db.pengguna.map((x) => (x.id === p.id ? p : x)) : [...db.pengguna, p],
  }), { senyap: true })
  catat(ada ? 'UBAH_PENGGUNA' : 'TAMBAH_PENGGUNA', 'Pengguna', `${p.nama} (${p.peran})`)
}

export function hapusPengguna(id: string) {
  const p = data.pengguna.find((x) => x.id === id)
  if (!p) return
  ubah((db) => ({ ...db, pengguna: db.pengguna.filter((x) => x.id !== id) }), { senyap: true })
  catat('HAPUS_PENGGUNA', 'Pengguna', `Menghapus akun ${p.nama}`)
}

export function ubahPeran(penggunaId: string, peran: Peran) {
  const p = data.pengguna.find((x) => x.id === penggunaId)
  if (!p) return
  simpanPengguna({ ...p, peran, izinTambahan: [], izinDicabut: [] })
  catat('UBAH_PERAN', 'Pengguna', `Peran ${p.nama} diubah menjadi ${peran}`)
}

export function ubahIzin(penggunaId: string, izin: string, aktif: boolean) {
  const p = data.pengguna.find((x) => x.id === penggunaId)
  if (!p) return
  const bawaan = IZIN_BAWAAN[p.peran].includes(izin as never)
  let tambahan = p.izinTambahan.filter((i) => i !== izin)
  let dicabut = p.izinDicabut.filter((i) => i !== izin)
  if (aktif) {
    if (!bawaan) tambahan = [...tambahan, izin]
  } else if (bawaan) {
    dicabut = [...dicabut, izin]
  }
  simpanPengguna({ ...p, izinTambahan: tambahan, izinDicabut: dicabut })
  catat('UBAH_IZIN', 'Perizinan', `${p.nama}: ${izin} -> ${aktif ? 'diizinkan' : 'dicabut'}`)
}

/* ------------------------------------------------------------ notifikasi */

export function tandaiDibaca(id?: string) {
  ubah((db) => ({
    ...db,
    notifikasi: db.notifikasi.map((n) => (id === undefined || n.id === id ? { ...n, dibaca: true } : n)),
  }), { senyap: true })
}

export function hapusNotifikasi(id: string) {
  ubah((db) => ({ ...db, notifikasi: db.notifikasi.filter((n) => n.id !== id) }), { senyap: true })
}

export function kirimPengumuman(judul: string, pesan: string, untukPenggunaId?: string) {
  beriNotifikasi({ judul, pesan, tipe: 'info', untukPenggunaId })
  catat('KIRIM_NOTIFIKASI', 'Notifikasi', `${judul} -> ${untukPenggunaId ? 'perorangan' : 'seluruh pasien'}`)
}

/* ------------------------------------------------------------- pengaturan */

export function simpanPengaturan(p: Partial<Pengaturan>) {
  ubah((db) => ({ ...db, pengaturan: { ...db.pengaturan, ...p } }), { senyap: true })
  catat('UBAH_PENGATURAN', 'Sistem', `Memperbarui pengaturan: ${Object.keys(p).join(', ')}`)
}

export function resetSistem() {
  const baru = seedDB()
  ubah(() => baru)
  catat('RESET_SISTEM', 'Sistem', 'Mengembalikan seluruh data ke kondisi awal')
}

/* --------------------------------------------------------- simulasi realtime */

export function simulasiLangkah() {
  if (!data.pengaturan.modeSimulasi) return
  const poliTerbuka = data.poli.filter((p) => p.aktif && p.kode !== 'IGD')
  if (!poliTerbuka.length) return
  const acakPoli = poliTerbuka[Math.floor(Math.random() * poliTerbuka.length)]
  const acakCabang = data.cabang[Math.floor(Math.random() * Math.min(2, data.cabang.length))]

  if (Math.random() < 0.55) {
    const namaDepan = ['Raka', 'Nadia', 'Yusuf', 'Kirana', 'Bram', 'Salsa', 'Reza', 'Alia', 'Galih', 'Nabila']
    const namaBelakang = ['Manggala', 'Pertiwi', 'Halim', 'Wibowo', 'Kusnadi', 'Saputri', 'Hakim']
    const nama = `${namaDepan[Math.floor(Math.random() * namaDepan.length)]} ${namaBelakang[Math.floor(Math.random() * namaBelakang.length)]}`
    const nomor = nomorBaru(data, acakPoli.id, acakCabang.id)
    const baru: Antrian = {
      id: uid('antrian'),
      kode: `${acakPoli.kode}-${pad2(nomor)}`,
      nomor,
      poliId: acakPoli.id,
      dokterId: dokterPraktik(data, acakPoli.id, acakCabang.id)?.id ?? data.dokter[0].id,
      cabangId: acakCabang.id,
      pasienId: '',
      pasienNama: nama,
      telepon: `08${Math.floor(Math.random() * 90) + 10}-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`,
      alasan: 'Datang langsung (walk-in)',
      prioritas: Math.random() < 0.16 ? 'lansia' : Math.random() < 0.08 ? 'darurat' : 'reguler',
      status: 'menunggu',
      ambilPada: new Date().toISOString(),
      estimasiAwal: estimasiDasar(data, acakPoli.id, acakCabang.id),
    }
    ubah((db) => ({ ...db, antrian: [...db.antrian, baru] }), { senyap: true })
    return
  }

  const menunggu = data.antrian.filter((a) => a.status === 'menunggu' && a.cabangId === acakCabang.id)
  if (menunggu.length > 2 && Math.random() < 0.5) {
    const terdepan = [...menunggu].sort(urutAntrian)[0]
    const sekarang = jam().slice(0, 2)
    void sekarang
    ubah((db) => ({
      ...db,
      antrian: db.antrian.map((a) =>
        a.id === terdepan.id
          ? { ...a, status: 'dipanggil' as StatusAntrian, dipanggilPada: new Date().toISOString() }
          : a.status === 'dipanggil' && Date.now() - new Date(a.dipanggilPada ?? 0).getTime() > 90000
            ? { ...a, status: 'dilayani' as StatusAntrian, dilayaniPada: new Date().toISOString() }
            : a,
      ),
    }), { senyap: true })
  }
}

export function mulaiSimulasi(): () => void {
  const t = window.setInterval(simulasiLangkah, 14000)
  return () => window.clearInterval(t)
}
