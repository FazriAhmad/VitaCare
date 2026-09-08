import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LogOut, Menu, Settings, Tv, X } from 'lucide-react'
import { Ikon } from './Icon'
import { Avatar, Kartu, Lencana } from './ui'
import { cariCabang, getDB, hapusNotifikasi, keluar, pakaiDB, pakaiPenggunaSesi, simpanPengaturan, tandaiDibaca } from '../lib/db'
import { boleh, labelPeran } from '../lib/permissions'
import { cn, jamDetik, relatifWaktu } from '../lib/utils'
import { realtime } from '../lib/realtime'
import { useTick } from './charts'
import type { Peran } from '../lib/types'

interface ItemNav { tautan: string; label: string; ikon: string; akhir?: boolean }

const NAV: Record<Peran, ItemNav[]> = {
  admin: [
    { tautan: '/admin', label: 'Ringkasan', ikon: 'dashboard' },
    { tautan: '/petugas/antrian', label: 'Manajemen Antrian', ikon: 'daftar' },
    { tautan: '/petugas/qr', label: 'Pindai QR', ikon: 'qr' },
    { tautan: '/admin/dokter', label: 'Dokter', ikon: 'dokter' },
    { tautan: '/admin/poli', label: 'Poli', ikon: 'poli' },
    { tautan: '/admin/jadwal', label: 'Jadwal Praktik', ikon: 'jadwal' },
    { tautan: '/admin/cabang', label: 'Multi Cabang', ikon: 'cabang' },
    { tautan: '/admin/analitik', label: 'Analitik', ikon: 'analitik' },
    { tautan: '/admin/laporan', label: 'Laporan & Ekspor', ikon: 'laporan' },
    { tautan: '/admin/pengguna', label: 'Pengguna & Izin', ikon: 'pengguna' },
    { tautan: '/admin/audit', label: 'Audit Log', ikon: 'audit' },
    { tautan: '/admin/pengaturan', label: 'Pengaturan', ikon: 'setelan', akhir: true },
  ],
  petugas: [
    { tautan: '/petugas', label: 'Monitoring', ikon: 'dashboard' },
    { tautan: '/petugas/antrian', label: 'Manajemen Antrian', ikon: 'daftar' },
    { tautan: '/petugas/qr', label: 'Pindai QR', ikon: 'qr' },
    { tautan: '/petugas/janji-temu', label: 'Janji Temu', ikon: 'kalender', akhir: true },
  ],
  dokter: [
    { tautan: '/dokter', label: 'Ruang Periksa', ikon: 'dashboard' },
    { tautan: '/dokter/riwayat', label: 'Riwayat Pasien', ikon: 'riwayat' },
    { tautan: '/dokter/jadwal', label: 'Jadwal Saya', ikon: 'jadwal', akhir: true },
  ],
  pasien: [
    { tautan: '/app', label: 'Antrian Saya', ikon: 'tiket' },
    { tautan: '/ambil', label: 'Ambil Nomor', ikon: 'tambah' },
    { tautan: '/app/janji-temu', label: 'Janji Temu', ikon: 'kalender' },
    { tautan: '/app/riwayat', label: 'Riwayat', ikon: 'riwayat', akhir: true },
  ],
}

function Logo({ kecil }: { kecil?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grad-teal flex h-9 w-9 items-center justify-center rounded-xl shadow-lg shadow-brand-900/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l2-5 3.5 11L15 10l1.6 2H21" />
        </svg>
      </span>
      {!kecil && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-white">VitaCare</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-brand-300">Sistem Antrian</span>
        </span>
      )}
    </Link>
  )
}

function IsiNav({ tutup }: { tutup?: () => void }) {
  const pengguna = pakaiPenggunaSesi()
  const db = pakaiDB()
  if (!pengguna) return null
  const items = NAV[pengguna.peran]
  const cabangAktif = db.cabang.find((c) => c.aktif)

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Menu {labelPeran(pengguna.peran)}</p>
      {items.map((i) => (
        <div key={i.tautan}>
          <NavLink
            to={i.tautan}
            onClick={tutup}
            end={i.tautan === '/admin' || i.tautan === '/petugas' || i.tautan === '/dokter' || i.tautan === '/app'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200',
                isActive ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/6 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId="nav_aktif" transition={{ type: 'spring', stiffness: 400, damping: 34 }} className="absolute inset-y-1 left-0 w-1 rounded-full bg-brand-400" />
                )}
                <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
                  <Ikon nama={i.ikon} ukuran={16} />
                </span>
                <span className="truncate">{i.label}</span>
              </>
            )}
          </NavLink>
          {i.akhir && (
            <div className="my-4 flex items-center gap-3 px-3">
              <span className="h-px flex-1 bg-white/10" />
              <Link to="/tv" onClick={tutup} className="flex items-center gap-1.5 text-[11px] font-medium text-brand-300/70 transition hover:text-brand-200">
                <Tv size={12} /> Display TV
              </Link>
              <span className="h-px flex-1 bg-white/10" />
            </div>
          )}
        </div>
      ))}
      {cabangAktif && (
        <p className="px-3 pt-4 text-[11px] leading-relaxed text-white/25">
          {cabangAktif.nama}<br />{cabangAktif.kota}
        </p>
      )}
    </nav>
  )
}

function Lonceng() {
  const [buka, setBuka] = useState(false)
  const db = pakaiDB()
  const pengguna = pakaiPenggunaSesi()
  const kotak = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const notif = useMemo(
    () => db.notifikasi.filter((n) => !n.untukPenggunaId || n.untukPenggunaId === pengguna?.id).slice(0, 12),
    [db.notifikasi, pengguna],
  )
  const belumDibaca = notif.filter((n) => !n.dibaca).length

  useEffect(() => {
    const luar = (e: MouseEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false)
    }
    document.addEventListener('mousedown', luar)
    return () => document.removeEventListener('mousedown', luar)
  }, [])

  const warna: Record<string, string> = {
    info: 'bg-blue-100 text-blue-600', sukses: 'bg-brand-100 text-brand-700',
    peringatan: 'bg-amber-100 text-amber-700', panggilan: 'bg-rose-100 text-rose-600',
  }

  return (
    <div className="relative" ref={kotak}>
      <button
        onClick={() => { setBuka((b) => !b); tandaiDibaca() }}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
        aria-label="Notifikasi"
      >
        <Bell size={17} />
        {belumDibaca > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white animate-blink">
            {belumDibaca}
          </span>
        )}
      </button>
      <AnimatePresence>
        {buka && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[0_28px_70px_-24px_rgba(14,26,34,0.5)]"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <span className="text-sm font-semibold text-ink-900">Notifikasi</span>
              <button onClick={() => { notif.forEach((n) => hapusNotifikasi(n.id)); setBuka(false) }} className="text-[11px] font-medium text-ink-400 hover:text-rose-600">
                Bersihkan
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notif.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-400">Belum ada notifikasi.</p>}
              {notif.map((n) => (
                <div key={n.id} className={cn('flex gap-3 border-b border-ink-50 px-4 py-3 last:border-0', !n.dibaca && 'bg-brand-50/40')}>
                  <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', warna[n.tipe] ?? warna.info)}>
                    <Ikon nama={n.tipe === 'panggilan' ? 'pengumuman' : n.tipe === 'peringatan' ? 'peringatan' : 'info'} ukuran={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-tight text-ink-800">{n.judul}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{n.pesan}</p>
                    <span className="mt-1 block text-[10px] text-ink-300">{relatifWaktu(n.dibuatPada)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { tandaiDibaca(); navigate('/app/riwayat'); setBuka(false) }}
              className="w-full border-t border-ink-100 py-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Lihat riwayat lengkap
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuPengguna() {
  const [buka, setBuka] = useState(false)
  const pengguna = pakaiPenggunaSesi()
  const navigate = useNavigate()
  const kotak = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const luar = (e: MouseEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false)
    }
    document.addEventListener('mousedown', luar)
    return () => document.removeEventListener('mousedown', luar)
  }, [])

  if (!pengguna) return null

  return (
    <div className="relative" ref={kotak}>
      <button onClick={() => setBuka((b) => !b)} className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-brand-300">
        <Avatar nama={pengguna.nama} url={pengguna.avatar} ukuran={30} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[9rem] truncate text-[12.5px] font-semibold text-ink-800">{pengguna.nama.split(',')[0]}</span>
          <span className="block text-[10px] text-ink-400">{labelPeran(pengguna.peran)}</span>
        </span>
      </button>
      <AnimatePresence>
        {buka && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-ink-200 bg-white p-1.5 shadow-[0_28px_70px_-24px_rgba(14,26,34,0.5)]"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-ink-900">{pengguna.nama}</p>
              <p className="truncate text-xs text-ink-400">{pengguna.email}</p>
            </div>
            <div className="my-1 h-px bg-ink-100" />
            <Link to={pengguna.peran === 'pasien' ? '/app' : pengguna.peran === 'dokter' ? '/dokter' : pengguna.peran === 'admin' ? '/admin' : '/petugas'} onClick={() => setBuka(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-700 transition hover:bg-ink-50">
              <Ikon nama="dashboard" ukuran={15} /> Dasbor saya
            </Link>
            {boleh(pengguna, 'ubah_pengaturan') && (
              <Link to="/admin/pengaturan" onClick={() => setBuka(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-700 transition hover:bg-ink-50">
                <Settings size={15} /> Pengaturan
              </Link>
            )}
            <button
              onClick={() => { keluar(); setBuka(false); navigate('/login') }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut size={15} /> Keluar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PilihCabang() {
  const db = pakaiDB()
  const [aktif, setAktif] = useState(() => localStorage.getItem('vitacare.cabang') ?? db.cabang[0]?.id)

  useEffect(() => {
    localStorage.setItem('vitacare.cabang', aktif ?? '')
  }, [aktif])

  if (db.cabang.length < 2) return null
  return (
    <div className="hidden items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-1.5 md:flex">
      <span className="h-2 w-2 rounded-full" style={{ background: cariCabang(db, aktif ?? '')?.warna ?? '#0c8672' }} />
      <select value={aktif} onChange={(e) => setAktif(e.target.value)} className="max-w-[11rem] bg-transparent text-[12.5px] font-medium text-ink-700 outline-none">
        {db.cabang.map((c) => (
          <option key={c.id} value={c.id}>{c.nama}</option>
        ))}
      </select>
    </div>
  )
}

export function tampilkanCabang(): string {
  return localStorage.getItem('vitacare.cabang') ?? getDB().cabang[0]?.id ?? ''
}

function IndikatorLive() {
  const [latensi, setLatensi] = useState(0)
  useTick(3000)
  useEffect(() => {
    const t = window.setInterval(() => setLatensi(realtime.latensi), 3000)
    return () => window.clearInterval(t)
  }, [])
  return (
    <div className="hidden items-center gap-2 rounded-xl border border-brand-200/60 bg-brand-50/60 px-3 py-1.5 lg:flex">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-400" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
      </span>
      <span className="text-[11px] font-semibold text-brand-700">Realtime</span>
      <span className="text-[10px] tabular-nums text-brand-500">{latensi || 1}ms</span>
    </div>
  )
}

export function AppShell({ children, judul, sub, aksi }: { children: React.ReactNode; judul: string; sub?: string; aksi?: React.ReactNode }) {
  const [laci, setLaci] = useState(false)
  const lokasi = useLocation()
  const pengguna = pakaiPenggunaSesi()
  const db = pakaiDB()
  useTick(1000)
  const menit = jamDetik().slice(0, 5)

  useEffect(() => { setLaci(false) }, [lokasi.pathname])

  useEffect(() => {
    if (!pengguna) return
    if (db.pengaturan.notifikasiBrowser && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        if (p !== 'granted') simpanPengaturan({ notifikasiBrowser: false })
      }).catch(() => simpanPengaturan({ notifikasiBrowser: false }))
    }
  }, [pengguna, db.pengaturan.notifikasiBrowser])

  if (!pengguna) return null

  return (
    <div className="flex min-h-screen bg-ink-50/60">
      {/* sidebar desktop */}
      <aside className="cetak-sembunyi grad-ink fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col lg:flex">
        <div className="px-5 py-5"><Logo /></div>
        <IsiNav />
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <Avatar nama={pengguna.nama} url={pengguna.avatar} ukuran={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-white">{pengguna.nama.split(',')[0]}</p>
              <p className="truncate text-[10.5px] text-brand-300">{labelPeran(pengguna.peran)}</p>
            </div>
            <button onClick={() => { keluar(); window.location.hash = '#/login' }} className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white" title="Keluar">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* laci mobile */}
      <AnimatePresence>
        {laci && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLaci(false)} className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm lg:hidden" />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="grad-ink fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-5 py-5">
                <Logo />
                <button onClick={() => setLaci(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10"><X size={18} /></button>
              </div>
              <IsiNav tutup={() => setLaci(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[260px]">
        <header className="cetak-sembunyi kaca sticky top-0 z-30 border-b border-ink-200/60">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button onClick={() => setLaci(true)} className="rounded-xl border border-ink-200 bg-white p-2 text-ink-600 lg:hidden" aria-label="Menu">
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink-900 sm:text-base">{judul}</h1>
              {sub && <p className="truncate text-[11.5px] text-ink-400">{sub}</p>}
            </div>
            <IndikatorLive />
            <PilihCabang />
            <Link to="/tv" className="hidden h-9 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-[12.5px] font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700 sm:flex" title="Buka display TV antrian">
              <Tv size={15} /> TV
            </Link>
            <span className="hidden text-[13px] font-semibold tabular-nums text-ink-500 sm:block">{menit}</span>
            <Lonceng />
            <MenuPengguna />
          </div>
          {aksi && <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-4 py-2.5 sm:px-6">{aksi}</div>}
        </header>

        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
          <motion.div key={lokasi.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            {children}
          </motion.div>
        </main>
      </div>

      {/* navigasi bawah mobile */}
      <nav className="cetak-sembunyi kaca fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-ink-200/70 px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV[pengguna.peran].slice(0, 5).map((i) => (
          <NavLink
            key={i.tautan}
            to={i.tautan}
            end={i.tautan === '/admin' || i.tautan === '/petugas' || i.tautan === '/dokter' || i.tautan === '/app'}
            className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors', isActive ? 'text-brand-700' : 'text-ink-400')}
          >
            <Ikon nama={i.ikon} ukuran={19} />
            <span className="truncate px-1">{i.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function KartuSorotan({ judul, nilai, sub, ikon, warna }: { judul: string; nilai: React.ReactNode; sub?: string; ikon: string; warna?: string }) {
  return (
    <Kartu className="relative overflow-hidden p-5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07]" style={{ background: warna ?? '#0c8672' }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-400">{judul}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-900">{nilai}</p>
          {sub && <p className="mt-1 text-[11.5px] text-ink-500">{sub}</p>}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${warna ?? '#0c8672'}18` }}>
          <Ikon nama={ikon} ukuran={19} />
        </span>
      </div>
    </Kartu>
  )
}

export function LencanaStatus({ status }: { status: string }) {
  const peta: Record<string, string> = {
    menunggu: 'bg-ink-100 text-ink-600 ring-ink-200',
    dipanggil: 'bg-blue-100 text-blue-700 ring-blue-200',
    dilayani: 'bg-amber-100 text-amber-800 ring-amber-200',
    selesai: 'bg-brand-100 text-brand-700 ring-brand-200',
    batal: 'bg-rose-100 text-rose-700 ring-rose-200',
    menunggu_jt: 'bg-ink-100 text-ink-600 ring-ink-200',
    dikonfirmasi: 'bg-blue-100 text-blue-700 ring-blue-200',
  }
  return <Lencana className={peta[status] ?? peta.menunggu}>{status.replace('_', ' ')}</Lencana>
}
