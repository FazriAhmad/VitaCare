/**
 * Selector murni yang beroperasi pada snapshot `DB` lokal — tidak menyentuh
 * jaringan. Dipisah dari db.ts supaya bisa diuji tanpa memicu efek samping
 * modul itu (koneksi WebSocket dibuka begitu db.ts di-import).
 */
import type { Antrian, DB, Dokter, Prioritas, StatusAntrian } from './types'

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
