import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import { Printer } from 'lucide-react'
import { Ikon } from './Icon'
import { Lencana, Tombol } from './ui'
import { LABEL_PRIORITAS, LABEL_STATUS, cariDokter, pakaiDB } from '../lib/db'
import { prediksiTunggu } from '../lib/analytics'
import { cn, jam, tanggalPanjang } from '../lib/utils'
import type { Antrian } from '../lib/types'

export function tautanTiket(kode: string): string {
  const dasar = window.location.href.split('#')[0]
  return `${dasar}#/status?kode=${encodeURIComponent(kode)}`
}

export function KartuTiket({ antrian, lengkap, cetak }: { antrian: Antrian; lengkap?: boolean; cetak?: () => void }) {
  const db = pakaiDB()
  const poli = db.poli.find((p) => p.id === antrian.poliId)
  const dokter = cariDokter(db, antrian.dokterId)
  const cabang = db.cabang.find((c) => c.id === antrian.cabangId)
  const prediksi = prediksiTunggu(db, antrian)
  const status = LABEL_STATUS[antrian.status]
  const prioritas = LABEL_PRIORITAS[antrian.prioritas]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-[0_24px_60px_-32px_rgba(14,26,34,0.5)]', lengkap && 'print:shadow-none')}
    >
      <div className="grad-ink relative px-6 py-5 text-white">
        <div className="bintik absolute inset-0 opacity-20" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-brand-300">Tiket Antrian</p>
            <p className="mt-1 text-sm font-medium text-white/80">{cabang?.nama}</p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ring-white/20', antrian.status === 'dipanggil' ? 'animate-blink bg-blue-500/30 text-blue-100' : 'bg-white/10 text-white/90')}>
            {status.label}
          </span>
        </div>
        <p className="nomor-antrian relative mt-3 text-[62px] font-bold leading-none">{antrian.kode}</p>
        <p className="relative mt-2 text-xs text-white/60">{poli?.nama} · {poli?.ruang}</p>
      </div>

      <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Lencana className={cn('ring-1 ring-inset', prioritas.latar)} titik={prioritas.titik}>{prioritas.label}</Lencana>
            {antrian.alasan && <span className="text-[12px] text-ink-500">{antrian.alasan}</span>}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-400">Nama Pasien</dt>
              <dd className="mt-0.5 truncate font-medium text-ink-800">{antrian.pasienNama}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-400">Dokter</dt>
              <dd className="mt-0.5 truncate font-medium text-ink-800">{dokter?.nama.split(',')[0] ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-400">Diambil</dt>
              <dd className="mt-0.5 font-medium text-ink-800">{tanggalPanjang(antrian.ambilPada)} · {jam(antrian.ambilPada)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-ink-400">Perkiraan Tunggu</dt>
              <dd className="mt-0.5 font-semibold text-brand-700">
                {antrian.status === 'selesai' ? 'Selesai' : `± ${prediksi.estimasi} menit`}
              </dd>
            </div>
          </dl>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-brand-800">Posisi antrean</span>
              <span className="font-semibold text-brand-700">Ke-{prediksi.posisi} dari {prediksi.antrianDepan + 1}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
              <motion.div
                className="h-full rounded-full bg-brand-600"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(6, 100 - (prediksi.posisi / Math.max(1, prediksi.antrianDepan + 1)) * 100)}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-brand-800/80">
              Rentang realistis {prediksi.rentangMin}–{prediksi.rentangMax} menit · keyakinan prediksi {prediksi.keyakinan}%
            </p>
          </div>
        </div>

        <div className="flex flex-row items-center gap-4 sm:flex-col sm:justify-center sm:border-l sm:border-dashed sm:border-ink-200 sm:pl-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-2.5 shadow-sm">
            <QRCodeSVG value={tautanTiket(antrian.kode)} size={lengkap ? 132 : 104} level="M" bgColor="#ffffff" fgColor="#0e1a22" />
          </div>
          <div className="text-[11px] leading-relaxed text-ink-400 sm:text-center">
            Pindai QR di<br />loket pendaftaran
          </div>
          {cetak && (
            <Tombol varian="tepi" ukuran="kecil" onClick={cetak} ikonKanan={<Printer size={13} />} className="print:hidden">
              Cetak
            </Tombol>
          )}
        </div>
      </div>

      {lengkap && prediksi.faktor.length > 0 && (
        <div className="border-t border-ink-100 bg-ink-50/60 px-6 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Faktor prediksi</p>
          <ul className="flex flex-wrap gap-2">
            {prediksi.faktor.map((f) => (
              <li key={f} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11.5px] text-ink-600 ring-1 ring-ink-200/70">
                <Ikon nama="centang" ukuran={12} /> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
