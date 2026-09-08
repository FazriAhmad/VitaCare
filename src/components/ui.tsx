import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, ChevronDown, Info, X } from 'lucide-react'
import { Ikon } from './Icon'
import { cn, inisial } from '../lib/utils'

/* ------------------------------------------------------------------ kartu */

export function Kartu({ children, className, gelap }: { children: ReactNode; className?: string; gelap?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-shadow duration-300',
        gelap ? 'border-white/10 bg-white/5' : 'border-ink-200/70 bg-white',
        !gelap && 'hover:shadow-[0_16px_40px_-28px_rgba(14,26,34,0.5)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------- tombol */

type VarianTombol = 'utama' | 'tepi' | 'lembut' | 'bahaya' | 'rahasia' | 'premium'

interface PropTombol extends ButtonHTMLAttributes<HTMLButtonElement> {
  varian?: VarianTombol
  ukuran?: 'kecil' | 'sedang' | 'besar'
  memuat?: boolean
  ikon?: string
  ikonKanan?: ReactNode
  lebar?: boolean
}

const VARIAN: Record<VarianTombol, string> = {
  utama: 'grad-teal text-white shadow-[0_10px_24px_-12px_rgba(12,134,114,0.9)] hover:brightness-110',
  tepi: 'border border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50',
  lembut: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  bahaya: 'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_10px_24px_-14px_rgba(244,63,94,0.9)]',
  rahasia: 'bg-ink-950 text-white hover:bg-ink-900',
  premium: 'bg-gradient-to-r from-ink-950 to-brand-800 text-white hover:brightness-110',
}

const UKURAN: Record<string, string> = {
  kecil: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-xl',
  sedang: 'h-11 px-5 text-sm gap-2 rounded-xl',
  besar: 'h-14 px-7 text-base gap-2.5 rounded-2xl',
}

export function Tombol({ varian = 'utama', ukuran = 'sedang', memuat, ikon, ikonKanan, lebar, className, children, ...rest }: PropTombol) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || memuat}
      className={cn(
        'inline-flex items-center justify-center font-medium tracking-tight transition-all duration-200 active:scale-[0.97]',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIAN[varian], UKURAN[ukuran], lebar && 'w-full', className,
      )}
    >
      {memuat ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : ikon ? (
        <Ikon nama={ikon} ukuran={ukuran === 'besar' ? 20 : 16} />
      ) : null}
      {children}
      {ikonKanan}
    </button>
  )
}

/* ---------------------------------------------------------------- masukan */

interface PropMasukan extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  galat?: string
  petunjuk?: string
  ikon?: string
  ikonKanan?: ReactNode
}

export function Masukan({ label, galat, petunjuk, ikon, ikonKanan, className, id, ...rest }: PropMasukan) {
  const identitas = id ?? `in_${(label ?? 'in').toLowerCase().replace(/\W/g, '')}`
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={identitas} className="block text-[13px] font-medium text-ink-700">{label}</label>}
      <div className="relative">
        {ikon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            <Ikon nama={ikon} ukuran={17} />
          </span>
        )}
        <input
          id={identitas}
          {...rest}
          className={cn(
            'h-11 w-full rounded-xl border bg-white text-sm text-ink-900 placeholder:text-ink-400 transition-all duration-200',
            'focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 focus:outline-none',
            galat ? 'border-rose-400 bg-rose-50/40' : 'border-ink-200',
            ikon && 'pl-10', ikonKanan ? 'pr-11' : 'pr-3.5',
            className,
          )}
        />
        {ikonKanan && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">{ikonKanan}</span>}
      </div>
      {galat && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
          <AlertCircle size={13} /> {galat}
        </p>
      )}
      {!galat && petunjuk && <p className="text-xs text-ink-400">{petunjuk}</p>}
    </div>
  )
}

export function AreaTeks({ label, className, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const identitas = id ?? 'ta_1'
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={identitas} className="block text-[13px] font-medium text-ink-700">{label}</label>}
      <textarea
        id={identitas}
        {...rest}
        className={cn(
          'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400',
          'focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 focus:outline-none',
          className,
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------ pilih (drop) */

export interface Opsi { nilai: string; label: string; sub?: string; warna?: string }

export function Pilih({
  label, opsi, nilai, onPilih, placeholder = 'Pilih…', galat, carian, ikon, className, kecil,
}: {
  label?: string
  opsi: Opsi[]
  nilai: string
  onPilih: (nilai: string) => void
  placeholder?: string
  galat?: string
  carian?: boolean
  ikon?: string
  className?: string
  kecil?: boolean
}) {
  const [buka, setBuka] = useState(false)
  const [kueri, setKueri] = useState('')
  const kotak = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const luar = (e: MouseEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false)
    }
    document.addEventListener('mousedown', luar)
    return () => document.removeEventListener('mousedown', luar)
  }, [])

  const tersaring = useMemo(
    () => (kueri ? opsi.filter((o) => (o.label + (o.sub ?? '')).toLowerCase().includes(kueri.toLowerCase())) : opsi),
    [opsi, kueri],
  )
  const terpilih = opsi.find((o) => o.nilai === nilai)

  return (
    <div className={cn('space-y-1.5', className)} ref={kotak}>
      {label && <span className="block text-[13px] font-medium text-ink-700">{label}</span>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setBuka((b) => !b)}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-xl border bg-white text-left text-sm transition-all duration-200',
            kecil ? 'h-9 px-3 text-[13px]' : 'h-11 px-3.5',
            galat ? 'border-rose-400' : 'border-ink-200',
            'hover:border-brand-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 focus:outline-none',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {ikon && <Ikon nama={ikon} ukuran={16} />}
            {!terpilih && <span className="text-ink-400">{placeholder}</span>}
            {terpilih && (
              <span className="flex min-w-0 items-center gap-2">
                {terpilih.warna && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: terpilih.warna }} />}
                <span className="truncate font-medium text-ink-800">{terpilih.label}</span>
                {terpilih.sub && <span className="truncate text-xs text-ink-400">{terpilih.sub}</span>}
              </span>
            )}
          </span>
          <ChevronDown size={16} className={cn('shrink-0 text-ink-400 transition-transform duration-200', buka && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {buka && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute z-50 mt-2 max-h-72 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-[0_24px_60px_-24px_rgba(14,26,34,0.45)]"
            >
              {carian && (
                <div className="border-b border-ink-100 p-2">
                  <input
                    autoFocus
                    value={kueri}
                    onChange={(e) => setKueri(e.target.value)}
                    placeholder="Cari…"
                    className="h-9 w-full rounded-lg bg-ink-50 px-3 text-sm outline-none placeholder:text-ink-400"
                  />
                </div>
              )}
              <div className="max-h-56 overflow-y-auto p-1.5">
                {tersaring.length === 0 && <p className="px-3 py-4 text-center text-sm text-ink-400">Tidak ada pilihan</p>}
                {tersaring.map((o) => (
                  <button
                    key={o.nilai}
                    type="button"
                    onClick={() => { onPilih(o.nilai); setBuka(false); setKueri('') }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      o.nilai === nilai ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-700 hover:bg-ink-50',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {o.warna && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.warna }} />}
                      <span className="min-w-0">
                        <span className="block truncate">{o.label}</span>
                        {o.sub && <span className="block truncate text-xs text-ink-400">{o.sub}</span>}
                      </span>
                    </span>
                    {o.nilai === nilai && <Check size={15} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {galat && <p className="text-xs font-medium text-rose-600">{galat}</p>}
    </div>
  )
}

export function PilihBawaan({ label, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <span className="block text-[13px] font-medium text-ink-700">{label}</span>}
      <select
        {...rest}
        className={cn(
          'h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 focus:outline-none',
          className,
        )}
      >
        {children}
      </select>
    </div>
  )
}

/* --------------------------------------------------------------- sakelar */

export function Sakelar({ aktif, onUbah, label, deskripsi, kecil }: { aktif: boolean; onUbah: (v: boolean) => void; label?: string; deskripsi?: string; kecil?: boolean }) {
  return (
    <button type="button" onClick={() => onUbah(!aktif)} className="flex w-full items-center justify-between gap-4 text-left">
      {(label || deskripsi) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink-800">{label}</span>}
          {deskripsi && <span className="block text-xs text-ink-500">{deskripsi}</span>}
        </span>
      )}
      <span className={cn('relative inline-flex shrink-0 items-center rounded-full transition-colors duration-300', kecil ? 'h-5 w-9' : 'h-6 w-11', aktif ? 'grad-teal' : 'bg-ink-200')}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn('rounded-full bg-white shadow', kecil ? 'h-4 w-4' : 'h-5 w-5', aktif ? (kecil ? 'ml-[18px]' : 'ml-[22px]') : 'ml-0.5')}
        />
      </span>
    </button>
  )
}

/* ---------------------------------------------------------------- lencana */

export function Lencana({ children, className, titik }: { children: ReactNode; className?: string; titik?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', className)}>
      {titik && <span className={cn('h-1.5 w-1.5 rounded-full', titik)} />}
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ modal */

export function Modal({ buka, onTutup, judul, sub, children, lebar = 'sedang' }: {
  buka: boolean
  onTutup: () => void
  judul: string
  sub?: string
  children: ReactNode
  lebar?: 'kecil' | 'sedang' | 'besar' | 'penuh'
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onTutup()
    if (buka) {
      document.addEventListener('keydown', esc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [buka, onTutup])

  const lebarKelas = { kecil: 'max-w-sm', sedang: 'max-w-xl', besar: 'max-w-3xl', penuh: 'max-w-6xl' }[lebar]

  return (
    <AnimatePresence>
      {buka && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onTutup}
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cn(
              'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-ink-200 bg-white shadow-2xl sm:rounded-3xl',
              lebarKelas,
            )}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-100 bg-white/95 px-6 py-5 backdrop-blur">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-ink-900">{judul}</h3>
                {sub && <p className="mt-0.5 text-sm text-ink-500">{sub}</p>}
              </div>
              <button onClick={onTutup} className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ toast */

type JenisToast = 'sukses' | 'galat' | 'info' | 'peringatan'
interface ItemToast { id: number; judul: string; pesan?: string; jenis: JenisToast }

const KonteksToast = createContext<{ tampilkan: (judul: string, pesan?: string, jenis?: JenisToast) => void }>({ tampilkan: () => undefined })

export function Pemberitahuan({ children }: { children: React.ReactNode }) {
  const [antrian, setAntrian] = useState<ItemToast[]>([])
  const berikut = useRef(1)

  const tampilkan = useCallback((judul: string, pesan?: string, jenis: JenisToast = 'sukses') => {
    const id = berikut.current++
    setAntrian((s) => [...s.slice(-3), { id, judul, pesan, jenis }])
    window.setTimeout(() => setAntrian((s) => s.filter((t) => t.id !== id)), 4200)
  }, [])

  const nilai = useMemo(() => ({ tampilkan }), [tampilkan])

  const gaya: Record<JenisToast, string> = {
    sukses: 'bg-brand-600 text-white',
    galat: 'bg-rose-600 text-white',
    info: 'bg-ink-900 text-white',
    peringatan: 'bg-amber-500 text-white',
  }

  return (
    <KonteksToast.Provider value={nilai}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5">
        <AnimatePresence>
          {antrian.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={cn('pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-2xl', gaya[t.jenis])}
            >
              <span className="mt-0.5 shrink-0">
                {t.jenis === 'sukses' ? <Check size={17} /> : t.jenis === 'galat' ? <AlertCircle size={17} /> : <Info size={17} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.judul}</p>
                {t.pesan && <p className="mt-0.5 text-[13px] leading-snug opacity-90">{t.pesan}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </KonteksToast.Provider>
  )
}

export function gunakanToast() {
  return useContext(KonteksToast)
}

/* ------------------------------------------------------------------ lainnya */

export function Kosong({ ikon = 'folder', judul, pesan, aksi }: { ikon?: string; judul: string; pesan?: string; aksi?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        <Ikon nama={ikon} ukuran={30} />
      </div>
      <h4 className="text-base font-semibold text-ink-800">{judul}</h4>
      {pesan && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{pesan}</p>}
      {aksi && <div className="mt-5">{aksi}</div>}
    </div>
  )
}

export function Spinner({ ukuran = 22, className }: { ukuran?: number; className?: string }) {
  return (
    <span
      className={cn('inline-block animate-spin rounded-full border-2 border-brand-200 border-t-brand-600', className)}
      style={{ width: ukuran, height: ukuran }}
    />
  )
}

export function Avatar({ nama, url, ukuran = 40, className }: { nama: string; url?: string; ukuran?: number; className?: string }) {
  const [gagal, setGagal] = useState(false)
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-semibold text-brand-700', className)}
      style={{ width: ukuran, height: ukuran, fontSize: ukuran * 0.36 }}
    >
      {url && !gagal ? (
        <img src={url} alt={nama} onError={() => setGagal(true)} className="h-full w-full object-cover" />
      ) : (
        <span>{inisial(nama)}</span>
      )}
    </div>
  )
}

export function Tab({ tab, aktif, onPilih }: { tab: string[]; aktif: string; onPilih: (t: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-ink-100/70 p-1">
      {tab.map((t) => (
        <button
          key={t}
          onClick={() => onPilih(t)}
          className={cn(
            'relative whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-medium transition-colors',
            aktif === t ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {aktif === t && (
            <motion.span layoutId="tab_pil" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-lg bg-white shadow-sm" />
          )}
          <span className="relative z-10">{t}</span>
        </button>
      ))}
    </div>
  )
}

export function JudulBagian({ judul, sub, aksi }: { judul: string; sub?: string; aksi?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">{judul}</h2>
        {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
      </div>
      {aksi}
    </div>
  )
}
