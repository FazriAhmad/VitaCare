import type { Antrian, DB, Dokter, Poli } from './types'
import { cariPoli, urutAntrian } from './db'
import { hariIniISO, namaHariPendek, pad2, selisihMenit } from './utils'

export interface Prediksi {
  posisi: number
  antrianDepan: number
  estimasi: number
  rentangMin: number
  rentangMax: number
  keyakinan: number
  faktor: string[]
}

/** Prediksi waktu tunggu berbasis beban antre, laju pelayanan, dan jadwal dokter. */
export function prediksiTunggu(db: DB, antrian: Antrian): Prediksi {
  const poli = cariPoli(db, antrian.poliId)
  const laju = Math.max(3, poli?.rataLayanan ?? 6)
  const antre = db.antrian
    .filter((a) => a.poliId === antrian.poliId && a.cabangId === antrian.cabangId && a.status !== 'selesai' && a.status !== 'batal')
    .sort(urutAntrian)

  const indeks = antre.findIndex((a) => a.id === antrian.id)
  const diDepan = indeks >= 0 ? antre.slice(0, indeks) : antre
  const faktor: string[] = []

  let total = 0
  for (const a of diDepan) {
    const bobot = a.prioritas === 'darurat' ? 1.4 : a.prioritas === 'reguler' ? 1 : 0.7
    total += laju * bobot
  }

  const sedangDilayani = antre.some((a) => a.status === 'dilayani')
  if (sedangDilayani) {
    total += laju * 0.5
    faktor.push('Sedang dalam pelayanan aktif')
  }
  if (antrian.prioritas !== 'reguler') {
    total *= 0.55
    faktor.push(`Prioritas ${antrian.prioritas} — diprioritaskan`)
  }
  if (diDepan.length > 8) {
    total *= 1.12
    faktor.push('Antrean padat, penyesuaian +12%')
  }

  const jamPraktik = db.jadwal.some((j) => j.dokterId === antrian.dokterId && j.hari === new Date().getDay() && j.cabangId === antrian.cabangId)
  if (!jamPraktik) {
    total += 20
    faktor.push('Di luar jadwal dokter — penambahan 20 menit')
  } else {
    faktor.push('Dokter sesuai jadwal praktik')
  }

  const estimasi = Math.max(1, Math.round(total))
  const dispersi = 0.22 + Math.min(0.3, diDepan.length * 0.02)
  return {
    posisi: (indeks >= 0 ? indeks : 0) + 1,
    antrianDepan: diDepan.length,
    estimasi,
    rentangMin: Math.max(1, Math.round(estimasi * (1 - dispersi))),
    rentangMax: Math.round(estimasi * (1 + dispersi)),
    keyakinan: Math.max(58, Math.min(96, 96 - diDepan.length * 2 - (jamPraktik ? 0 : 12))),
    faktor,
  }
}

/* --------------------------------------------------------------- statistik */

export interface Deret {
  label: string
  tanggal: string
  total: number
  selesai: number
  batal: number
}

export function kunjunganHarian(db: DB, hari = 14, cabangId?: string): Deret[] {
  const hasil: Deret[] = []
  for (let i = hari - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const daftar = db.antrian.filter((a) => a.ambilPada.slice(0, 10) === iso && (!cabangId || a.cabangId === cabangId))
    hasil.push({
      label: i === 0 ? 'Hari ini' : namaHariPendek(d.getDay()),
      tanggal: iso,
      total: daftar.length,
      selesai: daftar.filter((a) => a.status === 'selesai').length,
      batal: daftar.filter((a) => a.status === 'batal').length,
    })
  }
  return hasil
}

export function kunjunganPerPoli(db: DB, cabangId?: string) {
  return db.poli
    .map((p) => {
      const daftar = db.antrian.filter((a) => a.poliId === p.id && (!cabangId || a.cabangId === cabangId) && a.ambilPada.slice(0, 10) >= hariIniISO().slice(0, 8) + '01')
      const tunggu = daftar
        .filter((a) => a.dipanggilPada)
        .map((a) => selisihMenit(a.ambilPada, a.dipanggilPada!))
      const layan = daftar
        .filter((a) => a.dipanggilPada && a.selesaiPada)
        .map((a) => selisihMenit(a.dipanggilPada!, a.selesaiPada!))
      return {
        poli: p,
        kunjungan: daftar.length,
        rataTunggu: tunggu.length ? Math.round(tunggu.reduce((s, v) => s + v, 0) / tunggu.length) : 0,
        rataLayan: layan.length ? Math.round(layan.reduce((s, v) => s + v, 0) / layan.length) : 0,
        menunggu: daftar.filter((a) => a.status === 'menunggu' || a.status === 'dipanggil' || a.status === 'dilayani').length,
      }
    })
    .sort((a, b) => b.kunjungan - a.kunjungan)
}

export function bebanPerJam(db: DB, hari = 14, cabangId?: string) {
  const batas = new Date()
  batas.setDate(batas.getDate() - hari)
  const wadah: Record<number, number> = {}
  for (let h = 7; h <= 19; h++) wadah[h] = 0
  db.antrian.forEach((a) => {
    const t = new Date(a.ambilPada)
    if (t < batas) return
    if (cabangId && a.cabangId !== cabangId) return
    const h = t.getHours()
    if (wadah[h] !== undefined) wadah[h] += 1
  })
  return Object.entries(wadah).map(([h, v]) => ({ jam: `${pad2(Number(h))}:00`, nilai: v }))
}

export function performaDokter(db: DB, cabangId?: string) {
  return db.dokter
    .map((d: Dokter) => {
      const daftar = db.antrian.filter((a) => a.dokterId === d.id && a.selesaiPada && (!cabangId || a.cabangId === cabangId))
      const tunggu = daftar.filter((a) => a.dipanggilPada).map((a) => selisihMenit(a.ambilPada, a.dipanggilPada!))
      const layan = daftar.filter((a) => a.dipanggilPada && a.selesaiPada).map((a) => selisihMenit(a.dipanggilPada!, a.selesaiPada!))
      return {
        dokter: d,
        kunjungan: daftar.length,
        rataTunggu: tunggu.length ? Math.round(tunggu.reduce((s, v) => s + v, 0) / tunggu.length) : 0,
        rataLayan: layan.length ? Math.round(layan.reduce((s, v) => s + v, 0) / layan.length) : 0,
      }
    })
    .filter((x) => x.kunjungan > 0)
    .sort((a, b) => b.kunjungan - a.kunjungan)
}

export function distribusiStatus(db: DB, cabangId?: string) {
  const daftar = db.antrian.filter((a) => !cabangId || a.cabangId === cabangId)
  const hitung = (s: Antrian['status']) => daftar.filter((a) => a.status === s).length
  return [
    { label: 'Selesai', nilai: hitung('selesai'), warna: '#16a58d' },
    { label: 'Menunggu', nilai: hitung('menunggu'), warna: '#94a3b8' },
    { label: 'Dipanggil', nilai: hitung('dipanggil'), warna: '#3b82f6' },
    { label: 'Dilayani', nilai: hitung('dilayani'), warna: '#f59e0b' },
    { label: 'Batal', nilai: hitung('batal'), warna: '#f43f5e' },
  ].filter((x) => x.nilai > 0)
}

export function distribusiPrioritas(db: DB, cabangId?: string) {
  const daftar = db.antrian.filter((a) => a.ambilPada.slice(0, 10) === hariIniISO() && (!cabangId || a.cabangId === cabangId))
  const hitung = (p: Antrian['prioritas']) => daftar.filter((a) => a.prioritas === p).length
  return [
    { label: 'Reguler', nilai: hitung('reguler') },
    { label: 'Lansia', nilai: hitung('lansia') },
    { label: 'Ibu Hamil', nilai: hitung('hamil') },
    { label: 'Difabel', nilai: hitung('difabel') },
    { label: 'Darurat', nilai: hitung('darurat') },
  ]
}

export function ringkasanCabang(db: DB) {
  return db.cabang.map((c) => {
    const daftar = db.antrian.filter((a) => a.cabangId === c.id)
    const hariIni = daftar.filter((a) => a.ambilPada.slice(0, 10) === hariIniISO())
    const tunggu = daftar.filter((a) => a.dipanggilPada).map((a) => selisihMenit(a.ambilPada, a.dipanggilPada!))
    return {
      cabang: c,
      hariIni: hariIni.length,
      menunggu: hariIni.filter((a) => ['menunggu', 'dipanggil', 'dilayani'].includes(a.status)).length,
      selesai: hariIni.filter((a) => a.status === 'selesai').length,
      poli: db.poli.filter((p) => p.cabangIds.includes(c.id)).length,
      dokter: db.dokter.filter((d) => db.poli.some((p) => p.id === d.poliId && p.cabangIds.includes(c.id))).length,
      rataTunggu: tunggu.length ? Math.round(tunggu.reduce((s, v) => s + v, 0) / tunggu.length) : 0,
      janjiTemu: db.janjiTemu.filter((j) => j.cabangId === c.id).length,
    }
  })
}

export interface KPI {
  hariIni: number
  menunggu: number
  dilayani: number
  selesai: number
  batal: number
  rataTunggu: number
  rataLayan: number
  tingkatSelesai: number
  dibandingKemarin: number
}

export function kpi(db: DB, cabangId?: string): KPI {
  const hari = db.antrian.filter((a) => a.ambilPada.slice(0, 10) === hariIniISO() && (!cabangId || a.cabangId === cabangId))
  const kemarin = new Date()
  kemarin.setDate(kemarin.getDate() - 1)
  const isoKemarin = `${kemarin.getFullYear()}-${pad2(kemarin.getMonth() + 1)}-${pad2(kemarin.getDate())}`
  const daftarKemarin = db.antrian.filter((a) => a.ambilPada.slice(0, 10) === isoKemarin && (!cabangId || a.cabangId === cabangId))

  const tunggu = hari.filter((a) => a.dipanggilPada).map((a) => selisihMenit(a.ambilPada, a.dipanggilPada!))
  const layan = hari.filter((a) => a.dipanggilPada && a.selesaiPada).map((a) => selisihMenit(a.dipanggilPada!, a.selesaiPada!))
  const selesai = hari.filter((a) => a.status === 'selesai').length
  const batal = hari.filter((a) => a.status === 'batal').length

  return {
    hariIni: hari.length,
    menunggu: hari.filter((a) => a.status === 'menunggu').length,
    dilayani: hari.filter((a) => a.status === 'dipanggil' || a.status === 'dilayani').length,
    selesai,
    batal,
    rataTunggu: tunggu.length ? Math.round(tunggu.reduce((s, v) => s + v, 0) / tunggu.length) : 0,
    rataLayan: layan.length ? Math.round(layan.reduce((s, v) => s + v, 0) / layan.length) : 0,
    tingkatSelesai: hari.length ? Math.round((selesai / Math.max(1, hari.length - batal)) * 100) : 0,
    dibandingKemarin: daftarKemarin.length ? Math.round(((hari.length - daftarKemarin.length) / daftarKemarin.length) * 100) : 0,
  }
}

export function trenTunggu(db: DB, hari = 14, cabangId?: string): Deret[] {
  const dasar = kunjunganHarian(db, hari, cabangId)
  return dasar.map((d) => {
    const daftar = db.antrian.filter((a) => a.ambilPada.slice(0, 10) === d.tanggal && a.dipanggilPada && (!cabangId || a.cabangId === cabangId))
    const nilai = daftar.map((a) => selisihMenit(a.ambilPada, a.dipanggilPada!))
    return { ...d, total: nilai.length ? Math.round(nilai.reduce((s, v) => s + v, 0) / nilai.length) : 0 }
  })
}

export function poliDariId(db: DB, id: string): Poli | undefined {
  return cariPoli(db, id)
}
