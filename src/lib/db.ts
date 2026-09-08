import { useSyncExternalStore } from 'react'
import type { Antrian, AuditLog, Cabang, DB, Dokter, JanjiTemu, Jadwal, Notifikasi, Pengaturan, Pengguna, Peran, Poli, Prioritas, StatusAntrian } from './types'

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4010/api'
const KUNCI_SESI = 'vitacare.sesi.v3'
const JEDA_POLING = 6000

const KOSONG: DB = {
  versi: 3, cabang: [], poli: [], dokter: [], jadwal: [], antrian: [], janjiTemu: [],
  pengguna: [], notifikasi: [], audit: [],
  pengaturan: { namaRs: 'RS VitaCare', jamBuka: '07:30', jamTutup: '20:00', suaraPanggilan: true, notifikasiBrowser: false, modeSimulasi: false, selisihPanggilan: 4 },
}

let data: DB = KOSONG
let siap = false
let sesiId: string | null = null
try {
  sesiId = localStorage.getItem(KUNCI_SESI)
} catch {
  sesiId = null
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

export function pakaiPenggunaSesi(): Pengguna | null {
  useSyncExternalStore(langganSesi, () => sesiId, () => sesiId)
  useSyncExternalStore(langgan, getDB, getDB)
  if (!sesiId) return null
  return data.pengguna.find((p) => p.id === sesiId) ?? null
}

/* ------------------------------------------------------------------- API */

async function permintaan<T>(path: string, opsi: RequestInit = {}, senyapGalat = false): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, {
      ...opsi,
      headers: {
        'Content-Type': 'application/json',
        ...(sesiId ? { 'X-User-Id': sesiId } : {}),
        ...(opsi.headers ?? {}),
      },
    })
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

/** Ambil ulang seluruh koleksi dari server dan sebarkan ke komponen yang berlangganan. */
async function muatSemua() {
  const [cabang, poli, dokter, jadwal, antrian, janjiTemu, pengguna, notifikasi, audit, pengaturan] = await Promise.all([
    get<Cabang[]>('/cabang', true),
    get<Poli[]>('/poli', true),
    get<Dokter[]>('/dokter', true),
    get<Jadwal[]>('/jadwal', true),
    get<Antrian[]>('/antrian', true),
    get<JanjiTemu[]>('/janji-temu', true),
    get<Pengguna[]>('/pengguna', true),
    get<Notifikasi[]>(`/notifikasi${sesiId ? `?penggunaId=${sesiId}` : ''}`, true),
    get<AuditLog[]>('/audit', true),
    get<Pengaturan>('/pengaturan', true),
  ])
  data = { versi: 3, cabang, poli, dokter, jadwal, antrian, janjiTemu, pengguna, notifikasi, audit, pengaturan }
  siap = true
  sebar()
}

/**
 * Muat data awal & mulai polling berkala. Ini pengganti sementara realtime
 * sungguhan (WebSocket) — cukup untuk lintas perangkat, belum instan.
 * Lihat PRD VitaCare Fase 3.
 */
export function mulaiSinkronisasi(): () => void {
  void muatSemua()
  const t = window.setInterval(() => void muatSemua(), JEDA_POLING)
  return () => window.clearInterval(t)
}

/* --------------------------------------------------------------- autentik */

export async function masuk(email: string, sandi: string): Promise<{ ok: boolean; pesan: string }> {
  try {
    const hasil = await post<{ ok: boolean; pesan: string; pengguna: Pengguna }>('/auth/login', { email, sandi }, true)
    sesiId = hasil.pengguna.id
    try { localStorage.setItem(KUNCI_SESI, sesiId) } catch { /* abaikan */ }
    await muatSemua()
    sebarSesi()
    return { ok: true, pesan: hasil.pesan }
  } catch (err) {
    return { ok: false, pesan: err instanceof Error ? err.message : 'Gagal masuk.' }
  }
}

export async function daftar(input: { nama: string; email: string; sandi: string; telepon: string; nik?: string; cabangId: string }): Promise<{ ok: boolean; pesan: string }> {
  try {
    const hasil = await post<{ ok: boolean; pesan: string; pengguna: Pengguna }>('/auth/register', input, true)
    sesiId = hasil.pengguna.id
    try { localStorage.setItem(KUNCI_SESI, sesiId) } catch { /* abaikan */ }
    await muatSemua()
    sebarSesi()
    return { ok: true, pesan: hasil.pesan }
  } catch (err) {
    return { ok: false, pesan: err instanceof Error ? err.message : 'Gagal mendaftar.' }
  }
}

export function keluar() {
  sesiId = null
  try { localStorage.removeItem(KUNCI_SESI) } catch { /* abaikan */ }
  sebarSesi()
}

/* --------------------------------------------------------------- selector */
/* Murni beroperasi pada snapshot `DB` lokal — tidak menyentuh jaringan. */

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
  return db.antrian.filter((a) => a.status !== 'selesai' && a.status !== 'batal' && (!cabangId || a.cabangId === cabangId)).sort(urutAntrian)
}

export function antreanPoli(db: DB, poliId: string, cabangId?: string): Antrian[] {
  return db.antrian.filter((a) => a.poliId === poliId && a.status !== 'selesai' && a.status !== 'batal' && (!cabangId || a.cabangId === cabangId)).sort(urutAntrian)
}

export function panggilanTerakhir(db: DB, cabangId?: string): Antrian | null {
  const daftar = db.antrian
    .filter((a) => a.dipanggilPada && (a.status === 'dipanggil' || a.status === 'dilayani') && (!cabangId || a.cabangId === cabangId))
    .sort((a, b) => new Date(b.dipanggilPada!).getTime() - new Date(a.dipanggilPada!).getTime())
  return daftar[0] ?? null
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
