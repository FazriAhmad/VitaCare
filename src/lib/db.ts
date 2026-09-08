import { useSyncExternalStore } from 'react'
import type { Antrian, AuditLog, Cabang, DB, Dokter, JanjiTemu, Jadwal, Notifikasi, Pengaturan, Pengguna, Peran, Poli, Prioritas, StatusAntrian } from './types'
import { boleh } from './permissions'
import { realtime } from './realtime'

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4010/api'
const KUNCI_TOKEN = 'vitacare.token.v1'
/** Jaring pengaman kalau WebSocket putus — jalur utama tetap event `perubahan` dari realtime.ts. */
const JEDA_POLING_CADANGAN = 25000

const KOSONG: DB = {
  versi: 3, cabang: [], poli: [], dokter: [], jadwal: [], antrian: [], janjiTemu: [],
  pengguna: [], notifikasi: [], audit: [],
  pengaturan: { namaRs: 'RS VitaCare', jamBuka: '07:30', jamTutup: '20:00', suaraPanggilan: true, notifikasiBrowser: false, modeSimulasi: false, selisihPanggilan: 4 },
}

let data: DB = KOSONG
let siap = false
let token: string | null = null
let sesiPengguna: Pengguna | null = null
try {
  token = localStorage.getItem(KUNCI_TOKEN)
} catch {
  token = null
}

const pendengar = new Set<() => void>()
const pendengarSesi = new Set<() => void>()
const pendengarGalat = new Set<(pesan: string) => void>()

function sebar() { pendengar.forEach((f) => f()) }
function sebarSesi() { pendengarSesi.forEach((f) => f()) }
function laporGalat(pesan: string) { pendengarGalat.forEach((f) => f(pesan)) }

export function langgan(f: () => void) { pendengar.add(f); return () => { pendengar.delete(f) } }
export function langganSesi(f: () => void) { pendengarSesi.add(f); return () => { pendengarSesi.delete(f) } }
export function langganGalat(f: (pesan: string) => void) { pendengarGalat.add(f); return () => { pendengarGalat.delete(f) } }

export function getDB(): DB { return data }
export function pakaiDB(): DB { return useSyncExternalStore(langgan, getDB, getDB) }
export function pakaiSiap(): boolean { return useSyncExternalStore(langgan, () => siap, () => siap) }
export function pakaiPenggunaSesi(): Pengguna | null { return useSyncExternalStore(langganSesi, () => sesiPengguna, () => sesiPengguna) }

function aturSesi(p: Pengguna | null, t: string | null) {
  sesiPengguna = p
  token = t
  try {
    if (t) localStorage.setItem(KUNCI_TOKEN, t)
    else localStorage.removeItem(KUNCI_TOKEN)
  } catch { /* abaikan */ }
  sebarSesi()
}

/* ------------------------------------------------------------------- API */

async function permintaan<T>(path: string, opsi: RequestInit = {}, senyapGalat = false): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, {
      ...opsi,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opsi.headers ?? {}),
      },
    })
    if (res.status === 401 && sesiPengguna) aturSesi(null, null) // token kedaluwarsa/dicabut -> keluarkan
    if (res.status === 204) return undefined as T
    const isi = await res.json().catch(() => null)
    if (!res.ok) {
      const pesan = isi && typeof isi === 'object' && 'pesan' in isi ? String((isi as { pesan: unknown }).pesan) : `Permintaan gagal (${res.status})`
      throw new Error(pesan)
    }
    return isi as T
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Tidak dapat menghubungi server VitaCare.'
    if (!senyapGalat) laporGalat(pesan)
    throw err instanceof Error ? err : new Error(pesan)
  }
}

const get = <T,>(path: string, senyap = false) => permintaan<T>(path, { method: 'GET' }, senyap)
const post = <T,>(path: string, body?: unknown, senyap = false) => permintaan<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }, senyap)
const patch = <T,>(path: string, body?: unknown, senyap = false) => permintaan<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }, senyap)
const del = <T,>(path: string, senyap = false) => permintaan<T>(path, { method: 'DELETE' }, senyap)

/**
 * Ambil ulang seluruh koleksi dari server dan sebarkan ke komponen yang
 * berlangganan. Koleksi yang butuh login (janji temu, notifikasi) atau izin
 * admin (pengguna, audit log) hanya diminta kalau sesi saat ini memang
 * berhak — server menolak permintaan tanpa izin, tapi tidak ada gunanya
 * memintanya untuk tamu/pasien biasa.
 */
async function muatSemua() {
  const [cabang, poli, dokter, jadwal, antrian, pengaturan] = await Promise.all([
    get<Cabang[]>('/cabang', true),
    get<Poli[]>('/poli', true),
    get<Dokter[]>('/dokter', true),
    get<Jadwal[]>('/jadwal', true),
    get<Antrian[]>('/antrian', true),
    get<Pengaturan>('/pengaturan', true),
  ])
  const [janjiTemu, notifikasi] = sesiPengguna
    ? await Promise.all([get<JanjiTemu[]>('/janji-temu', true), get<Notifikasi[]>('/notifikasi', true)])
    : [[], []]
  const pengguna = boleh(sesiPengguna, 'kelola_pengguna') ? await get<Pengguna[]>('/pengguna', true) : []
  const audit = boleh(sesiPengguna, 'lihat_audit') ? await get<AuditLog[]>('/audit', true) : []

  data = { versi: 3, cabang, poli, dokter, jadwal, antrian, janjiTemu, pengguna, notifikasi, audit, pengaturan }
  siap = true
  sebar()
}

/** Pulihkan sesi dari token tersimpan (kalau ada) dengan memanggil /auth/me. */
async function muatSesi() {
  if (!token) return
  try {
    sesiPengguna = await get<Pengguna>('/auth/me', true)
    sebarSesi()
  } catch {
    aturSesi(null, null)
  }
}

/**
 * Muat data awal, lalu ikuti event `perubahan` dari WebSocket (lih.
 * lib/realtime.ts) untuk muat ulang nyaris instan lintas perangkat.
 * Polling berkala tetap jalan sebagai jaring pengaman kalau koneksi socket
 * sempat putus (mis. jaringan TV display sempat drop).
 */
export function mulaiSinkronisasi(): () => void {
  void muatSesi().then(muatSemua)
  const berhentiRealtime = realtime.langgan(() => void muatSemua())
  const t = window.setInterval(() => void muatSemua(), JEDA_POLING_CADANGAN)
  return () => {
    window.clearInterval(t)
    berhentiRealtime()
  }
}

/* --------------------------------------------------------------- autentik */

export async function masuk(email: string, sandi: string): Promise<{ ok: boolean; pesan: string }> {
  try {
    const hasil = await post<{ ok: boolean; pesan: string; token: string; pengguna: Pengguna }>('/auth/login', { email, sandi }, true)
    aturSesi(hasil.pengguna, hasil.token)
    await muatSemua()
    return { ok: true, pesan: hasil.pesan }
  } catch (err) {
    return { ok: false, pesan: err instanceof Error ? err.message : 'Gagal masuk.' }
  }
}

export async function daftar(input: { nama: string; email: string; sandi: string; telepon: string; nik?: string; cabangId: string }): Promise<{ ok: boolean; pesan: string }> {
  try {
    const hasil = await post<{ ok: boolean; pesan: string; token: string; pengguna: Pengguna }>('/auth/register', input, true)
    aturSesi(hasil.pengguna, hasil.token)
    await muatSemua()
    return { ok: true, pesan: hasil.pesan }
  } catch (err) {
    return { ok: false, pesan: err instanceof Error ? err.message : 'Gagal mendaftar.' }
  }
}

export function keluar() {
  aturSesi(null, null)
  void muatSemua()
}

/* --------------------------------------------------------------- selector */
export * from './selectors'

/* ---------------------------------------------------------------- antrian */

export async function ambilNomor(input: {
  poliId: string; cabangId: string; dokterId?: string; nama: string; telepon: string
  alasan: string; prioritas: Prioritas; pasienId?: string
}): Promise<Antrian> {
  const antrian = await post<Antrian>('/antrian', input, true)
  await muatSemua()
  return antrian
}

export async function panggilAntrian(id: string) {
  const hasil = await post<Antrian>(`/antrian/${id}/panggil`)
  await muatSemua()
  return hasil
}

export async function panggilBerikutnya(poliId: string, cabangId: string): Promise<Antrian | null> {
  try {
    const hasil = await post<Antrian>('/antrian/panggil-berikutnya', { poliId, cabangId }, true)
    await muatSemua()
    return hasil
  } catch {
    return null
  }
}

export async function ubahStatusAntrian(id: string, status: StatusAntrian, catatan?: string) {
  await patch(`/antrian/${id}/status`, { status, catatan })
  await muatSemua()
}

export async function ubahPrioritas(id: string, prioritas: Prioritas) {
  await patch(`/antrian/${id}/prioritas`, { prioritas })
  await muatSemua()
}

export async function pindahkanCabang(id: string, cabangId: string) {
  await patch(`/antrian/${id}/cabang`, { cabangId })
  await muatSemua()
}

export async function resetAntrianHarian(cabangId: string) {
  await post('/antrian/reset-harian', { cabangId })
  await muatSemua()
}

/* --------------------------------------------------------------- janji temu */

export async function buatJanjiTemu(input: { pasienId: string; dokterId: string; tanggal: string; jam: string; alasan: string; cabangId: string }): Promise<JanjiTemu> {
  const jt = await post<JanjiTemu>('/janji-temu', input)
  await muatSemua()
  return jt
}

export async function statusJanjiTemu(id: string, status: JanjiTemu['status']) {
  await patch(`/janji-temu/${id}/status`, { status })
  await muatSemua()
}

export async function janjiTemuKeAntrian(id: string): Promise<Antrian> {
  const antrian = await post<Antrian>(`/janji-temu/${id}/ke-antrian`)
  await muatSemua()
  return antrian
}

/* ------------------------------------------------------------- master data */

export async function simpanPoli(poli: Poli) { await post('/poli', poli); await muatSemua() }
export async function hapusPoli(id: string) { await del(`/poli/${id}`); await muatSemua() }

export async function simpanDokter(dokter: Dokter) { await post('/dokter', dokter); await muatSemua() }
export async function hapusDokter(id: string) { await del(`/dokter/${id}`); await muatSemua() }

export async function simpanJadwal(jadwal: Jadwal) { await post('/jadwal', jadwal); await muatSemua() }
export async function hapusJadwal(id: string) { await del(`/jadwal/${id}`); await muatSemua() }

export async function simpanCabang(cabang: Cabang) { await post('/cabang', cabang); await muatSemua() }
export async function hapusCabang(id: string) { await del(`/cabang/${id}`); await muatSemua() }

/* --------------------------------------------------------------- pengguna */

export async function simpanPengguna(p: Pengguna) { await post('/pengguna', p); await muatSemua() }
export async function hapusPengguna(id: string) { await del(`/pengguna/${id}`); await muatSemua() }
export async function ubahPeran(penggunaId: string, peran: Peran) { await patch(`/pengguna/${penggunaId}/peran`, { peran }); await muatSemua() }
export async function ubahIzin(penggunaId: string, izin: string, aktif: boolean) { await patch(`/pengguna/${penggunaId}/izin`, { izin, aktif }); await muatSemua() }

/* ------------------------------------------------------------ notifikasi */

export async function tandaiDibaca(id?: string) { await patch('/notifikasi/dibaca', { id }, true); await muatSemua() }
export async function hapusNotifikasi(id: string) { await del(`/notifikasi/${id}`, true); await muatSemua() }
export async function kirimPengumuman(judul: string, pesan: string, untukPenggunaId?: string) { await post('/notifikasi/pengumuman', { judul, pesan, untukPenggunaId }); await muatSemua() }

/* ------------------------------------------------------------- pengaturan */

export async function simpanPengaturan(p: Partial<Pengaturan>) { await patch('/pengaturan', p); await muatSemua() }
export async function resetSistem() { await post('/pengaturan/reset-sistem'); await muatSemua() }
