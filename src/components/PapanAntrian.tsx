import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Volume2, VolumeX } from 'lucide-react'
import { Ikon } from './Icon'
import { pakaiDB, panggilanTerakhir, simpanPengaturan, urutAntrian } from '../lib/db'
import { cn, jamDetik, tanggalPanjang } from '../lib/utils'

export function PapanAntrian({ cabangId, ringkas = false }: { cabangId: string; ringkas?: boolean }) {
  const db = pakaiDB()
  const [detik, setDetik] = useState(0)
  const [layarPenuh, setLayarPenuh] = useState(false)

  useEffect(() => {
    const t = window.setInterval(() => setDetik((d) => d + 1), 1000)
    return () => window.clearInterval(t)
  }, [])

  const cabang = db.cabang.find((c) => c.id === cabangId) ?? db.cabang[0]
  const dipanggil = panggilanTerakhir(db, cabangId)
  const poliDipanggil = db.poli.find((p) => p.id === dipanggil?.poliId)

  const antreAktif = db.antrian
    .filter((a) => a.cabangId === cabangId && (a.status === 'menunggu' || a.status === 'dipanggil'))
    .sort(urutAntrian)
  const berikutnya = antreAktif.filter((a) => a.id !== dipanggil?.id).slice(0, ringkas ? 3 : 6)

  const poliTampil = db.poli.filter((p) => p.aktif && p.cabangIds.includes(cabangId)).slice(0, ringkas ? 6 : 10)
  const pengumuman = [
    'Selamat datang di VitaCare — layanan antrian digital terintegrasi.',
    'Mohon menyiapkan kartu identitas dan rujukan (bila ada) sebelum dipanggil.',
    'Nomor antrian dapat dipantau melalui QR pada tiket Anda.',
    'Prioritas layanan diberikan pada lansia, ibu hamil, dan difabel.',
  ]
  const teksBerjalan = pengumuman[detik % pengumuman.length]

  const isi = (
    <div className="flex h-full flex-col gap-4 p-5 lg:p-8">
      {/* kepala */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grad-teal flex h-11 w-11 items-center justify-center rounded-2xl">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l2-5 3.5 11L15 10l1.6 2H21" />
            </svg>
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">{db.pengaturan.namaRs}</p>
            <p className="text-xs text-brand-300">{cabang?.nama} · {cabang?.kota}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-white lg:text-4xl">{jamDetik()}</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{tanggalPanjang(new Date())}</p>
        </div>
      </div>

      {/* panggilan utama */}
      <div className="relative grid flex-1 gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 lg:grid-cols-[1.15fr_1fr] lg:p-7">
        <div className="bintik pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-300">Sedang Dipanggil</p>
          <AnimatePresence mode="popLayout">
            <motion.p
              key={dipanggil?.id ?? 'kosong'}
              initial={{ opacity: 0, y: 26, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -26, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 210, damping: 22 }}
              className="nomor-antrian mt-2 text-[clamp(3.6rem,11vw,8.5rem)] font-bold leading-[0.92] text-white"
              style={{ textShadow: '0 0 60px rgba(22,165,141,0.55)' }}
            >
              {dipanggil?.kode ?? '— —'}
            </motion.p>
          </AnimatePresence>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/70">
            <span className="flex items-center gap-2">
              <Ikon nama="poli" ukuran={15} /> {poliDipanggil?.nama ?? 'Menunggu panggilan'}
            </span>
            <span className="flex items-center gap-2">
              <Ikon nama="gedung" ukuran={15} /> {poliDipanggil?.ruang ?? '-'}
            </span>
            <span className="flex items-center gap-2">
              <Ikon nama="dokter" ukuran={15} /> {db.dokter.find((d) => d.id === dipanggil?.dokterId)?.nama.split(',')[0] ?? '-'}
            </span>
          </div>
          {dipanggil?.pasienNama && (
            <p className="mt-4 max-w-md truncate rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white/60">
              Atas nama <span className="font-medium text-white/90">{dipanggil.pasienNama}</span>
            </p>
          )}
        </div>

        <div className="relative flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">Panggilan Berikutnya</p>
          {berikutnya.length === 0 && <p className="py-6 text-center text-sm text-white/30">Antrean kosong</p>}
          {berikutnya.map((a, i) => {
            const p = db.poli.find((x) => x.id === a.poliId)
            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
              >
                <span className="h-9 w-1 rounded-full" style={{ background: p?.warna ?? '#16a58d' }} />
                <span className="nomor-antrian min-w-[5.5rem] text-2xl font-bold text-white">{a.kode}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-white/55">{p?.nama}</span>
                {a.prioritas !== 'reguler' && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-200">{a.prioritas}</span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* status per poli */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {poliTampil.map((p) => {
          const menunggu = db.antrian.filter((a) => a.poliId === p.id && a.cabangId === cabangId && a.status === 'menunggu').length
          const layanan = db.antrian.find((a) => a.poliId === p.id && a.cabangId === cabangId && a.status === 'dilayani')
          return (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: p.warna }} />
                <p className="truncate text-[12.5px] font-medium text-white/85">{p.nama.replace('Poli ', '')}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{menunggu}</p>
              <p className="text-[10.5px] text-white/35">menunggu · {layanan ? `dilayani ${layanan.kode}` : 'belum dilayani'}</p>
            </div>
          )
        })}
      </div>

      {/* teks berjalan */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-500/20 bg-brand-500/10 py-2.5">
        <div className="flex w-max animate-marquee gap-16 whitespace-nowrap text-[13px] font-medium text-brand-200">
          <span>✦ {teksBerjalan}</span>
          <span>✦ {pengumuman[(detik + 1) % pengumuman.length]}</span>
          <span>✦ {pengumuman[(detik + 2) % pengumuman.length]}</span>
          <span>✦ {teksBerjalan}</span>
          <span>✦ {pengumuman[(detik + 1) % pengumuman.length]}</span>
          <span>✦ {pengumuman[(detik + 2) % pengumuman.length]}</span>
        </div>
      </div>
    </div>
  )

  if (ringkas) {
    return (
      <div className="grad-ink relative overflow-hidden rounded-3xl border border-ink-900/40">
        {isi}
      </div>
    )
  }

  return (
    <div className={cn('grad-ink relative min-h-screen w-full overflow-hidden')}>
      {isi}
      <div className="absolute right-5 top-20 flex flex-col gap-2 lg:right-8">
        <button
          onClick={() => setLayarPenuh((v) => !v)}
          className="rounded-xl border border-white/15 bg-white/10 p-2.5 text-white/70 backdrop-blur transition hover:bg-white/20 hover:text-white"
          title="Layar penuh"
        >
          <Maximize2 size={16} className={cn(layarPenuh && 'rotate-45')} />
        </button>
        <button
          onClick={() => simpanPengaturan({ suaraPanggilan: !db.pengaturan.suaraPanggilan })}
          className="rounded-xl border border-white/15 bg-white/10 p-2.5 text-white/70 backdrop-blur transition hover:bg-white/20 hover:text-white"
          title={db.pengaturan.suaraPanggilan ? 'Matikan suara' : 'Nyalakan suara'}
        >
          {db.pengaturan.suaraPanggilan ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
      {layarPenuh && (
        <button
          onClick={() => setLayarPenuh(false)}
          className="absolute bottom-5 right-5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/70 backdrop-blur"
        >
          Keluar layar penuh
        </button>
      )}
    </div>
  )
}
