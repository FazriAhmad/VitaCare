export function cn(...potong: Array<string | false | null | undefined>): string {
  return potong.filter(Boolean).join(' ')
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export const namaHari = (i: number) => HARI[i % 7]
export const namaHariPendek = (i: number) => HARI_PENDEK[i % 7]

export function tanggalPanjang(d: Date | string): string {
  const t = typeof d === 'string' ? new Date(d) : d
  return `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`
}

export function tanggalPendek(d: Date | string): string {
  const t = typeof d === 'string' ? new Date(d) : d
  return `${pad2(t.getDate())}/${pad2(t.getMonth() + 1)}/${t.getFullYear()}`
}

export function jam(d?: Date | string | null): string {
  const t = d ? (typeof d === 'string' ? new Date(d) : d) : new Date()
  return `${pad2(t.getHours())}:${pad2(t.getMinutes())}`
}

export function jamDetik(d?: Date | string | null): string {
  const t = d ? (typeof d === 'string' ? new Date(d) : d) : new Date()
  return `${pad2(t.getHours())}:${pad2(t.getMinutes())}:${pad2(t.getSeconds())}`
}

export function selisihMenit(dari: string, ke: string | Date = new Date().toISOString()): number {
  const a = new Date(dari).getTime()
  const b = (typeof ke === 'string' ? new Date(ke) : ke).getTime()
  return Math.max(0, Math.round((b - a) / 60000))
}

export function hariIniISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function relatifWaktu(iso: string): string {
  const detik = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (detik < 45) return 'Baru saja'
  if (detik < 3600) return `${Math.max(1, Math.round(detik / 60))} menit lalu`
  if (detik < 86400) return `${Math.round(detik / 3600)} jam lalu`
  if (detik < 604800) return `${Math.round(detik / 86400)} hari lalu`
  return tanggalPendek(iso)
}

export function unduhBerkas(nama: string, isi: string, tipe: string) {
  const blob = new Blob([isi], { type: `${tipe};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function keCSV(kolom: string[], baris: Array<Array<string | number>>): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [kolom.map(esc).join(';'), ...baris.map((b) => b.map(esc).join(';'))].join('\n')
}

export function inisial(nama: string): string {
  const bersih = nama.replace(/^(dr\.|drs\.|h\.|hj\.)\s*/gi, '').trim()
  const bagian = bersih.split(/\s+/).filter(Boolean)
  const a = bagian[0]?.[0] ?? ''
  const b = bagian.length > 1 ? bagian[bagian.length - 1][0] : ''
  return (a + b).toUpperCase() || '?'
}

export function angkaRibuan(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

export function validasiEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

export function angkaTelepon(v: string): string {
  return v.replace(/\D/g, '').replace(/^0/, '62')
}

export function warnaDariString(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return `hsl(${h} 62% 46%)`
}
