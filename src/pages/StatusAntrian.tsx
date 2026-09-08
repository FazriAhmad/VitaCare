import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Clock, Phone, Printer } from 'lucide-react'
import { Ikon } from '../components/Icon'
import { KartuTiket } from '../components/KartuTiket'
import { Kosong, Lencana, Pilih, Tombol, gunakanToast } from '../components/ui'
import { useTick } from '../components/charts'
import { LABEL_PRIORITAS, cariDokter, pakaiDB, ubahStatusAntrian, urutAntrian } from '../lib/db'
import { prediksiTunggu } from '../lib/analytics'
import { cn, jam, selisihMenit, tanggalPanjang } from '../lib/utils'
import type { Antrian, StatusAntrian } from '../lib/types'

const LANGKAH: Array<{ status: StatusAntrian; label: string; ikon: string }> = [
  { status: 'menunggu', label: 'Nomor diambil', ikon: 'tiket' },
  { status: 'dipanggil', label: 'Sedang dipanggil', ikon: 'pengumuman' },
  { status: 'dilayani', label: 'Sedang diperiksa', ikon: 'dokter' },
  { status: 'selesai', label: 'Selesai dilayani', ikon: 'centang' },
]

export function StatusAntrian() {
  const db = pakaiDB()
  const [param] = useSearchParams()
  const [kode, setKode] = useState('')
  const [dicari, setDicari] = useState('')
  const tick = useTick(15000)
  const { tampilkan } = gunakanToast()

  useEffect(() => {
    const k = param.get('kode')
    if (k) {
      setKode(k.toUpperCase())
      setDicari(k.toUpperCase())
    }
  }, [param])

  const hasil = useMemo(() => {
    if (!dicari) return null
    return db.antrian.find((a) => a.kode.toUpperCase() === dicari.trim().toUpperCase()) ?? null
  }, [dicari, db.antrian])

  const poli = hasil ? db.poli.find((p) => p.id === hasil.poliId) : null
  const dokter = hasil ? cariDokter(db, hasil.dokterId) : null
  const cabang = hasil ? db.cabang.find((c) => c.id === hasil.cabangId) : null
  const prediksi = hasil ? prediksiTunggu(db, hasil) : null
  void tick

  const indeksLangkah = hasil ? Math.max(0, LANGKAH.findIndex((l) => l.status === hasil.status)) : -1

  const antre = useMemo(() => {
    if (!hasil) return []
    return db.antrian
      .filter((a) => a.poliId === hasil.poliId && a.cabangId === hasil.cabangId && a.status !== 'selesai' && a.status !== 'batal')
      .sort(urutAntrian)
      .slice(0, 6)
  }, [db.antrian, hasil])

  const batal = () => {
    if (!hasil) return
    ubahStatusAntrian(hasil.id, 'batal', 'Dibatalkan oleh pasien')
    tampilkan('Antrian dibatalkan', `Nomor ${hasil.kode} telah dibatalkan.`, 'peringatan')
  }

  return (
    <div className="min-h-screen bg-ink-50/70">
      <header className="kaca sticky top-0 z-30 border-b border-ink-100">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grad-teal flex h-9 w-9 items-center justify-center rounded-xl">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l2-5 3.5 11L15 10l1.6 2H21" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink-900">Cek Status Antrian</span>
          </Link>
          <Link to="/ambil" className="text-[13px] font-semibold text-brand-700 hover:text-brand-800">Ambil nomor baru</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(14,26,34,0.5)] sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">Lacak nomor antrian Anda</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-500">Masukkan kode pada tiket, contoh <span className="font-semibold text-ink-700">UMU-07</span>. Data diperbarui otomatis.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); setDicari(kode) }}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="KODE ANTRIAN"
              className="h-12 flex-1 rounded-xl border border-ink-200 px-4 text-center text-lg font-semibold uppercase tracking-[0.18em] text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 focus:outline-none"
            />
            <Tombol type="submit" ukuran="besar" ikon="cari">Cari Antrian</Tombol>
          </form>
        </div>

        <AnimatePresence mode="wait">
          {dicari && !hasil && (
            <motion.div key="kosong" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
              <div className="rounded-3xl border border-ink-200 bg-white">
                <Kosong ikon="cari" judul={`Nomor "${dicari}" tidak ditemukan`} pesan="Periksa kembali ejaan kode pada tiket Anda, atau ambil nomor baru di loket." aksi={<Link to="/ambil"><Tombol>Tambil Nomor Baru</Tombol></Link>} />
              </div>
            </motion.div>
          )}

          {hasil && prediksi && (
            <motion.div key={hasil.id + hasil.status} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <KartuTiket antrian={hasil} lengkap cetak={() => window.print()} />

                <div className="space-y-4">
                  <div className="rounded-3xl border border-ink-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[15px] font-semibold text-ink-900">Status terkini</h2>
                      <Lencana className={cn('ring-1 ring-inset', hasil.status === 'dipanggil' ? 'animate-blink bg-blue-100 text-blue-700 ring-blue-200' : 'bg-brand-50 text-brand-700 ring-brand-200')}>
                        {hasil.status === 'menunggu' ? 'Menunggu giliran' : hasil.status}
                      </Lencana>
                    </div>

                    <ol className="mt-5 space-y-0">
                      {LANGKAH.map((l, i) => {
                        const lewat = hasil.status === 'selesai' ? true : i <= indeksLangkah
                        const aktifLangkah = hasil.status !== 'selesai' && i === indeksLangkah
                        return (
                          <li key={l.status} className="flex gap-3.5">
                            <div className="flex flex-col items-center">
                              <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-500', lewat ? 'grad-teal border-transparent' : 'border-ink-200 bg-white')}>
                                {lewat ? <Check size={16} className="text-white" /> : <Ikon nama={l.ikon} ukuran={15} />}
                              </span>
                              {i < LANGKAH.length - 1 && <span className={cn('my-1 w-px flex-1 transition-colors duration-500', lewat ? 'bg-brand-400' : 'bg-ink-200')} />}
                            </div>
                            <div className="pb-5">
                              <p className={cn('text-[13.5px] font-medium', lewat ? 'text-ink-900' : 'text-ink-400')}>{l.label}</p>
                              <p className="text-[11.5px] text-ink-400">
                                {l.status === 'menunggu' && `Diambil ${jam(hasil.ambilPada)} · menunggu ${selisihMenit(hasil.ambilPada)} menit`}
                                {l.status === 'dipanggil' && (hasil.dipanggilPada ? `Dipanggil ${jam(hasil.dipanggilPada)} ke ${poli?.ruang}` : 'Menunggu giliran dipanggil')}
                                {l.status === 'dilayani' && (hasil.dilayaniPada ? `Mulai diperiksa ${jam(hasil.dilayaniPada)}` : 'Menunggu pemeriksaan')}
                                {l.status === 'selesai' && (hasil.selesaiPada ? `Selesai ${jam(hasil.selesaiPada)}` : 'Belum selesai')}
                              </p>
                              {aktifLangkah && <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> berlangsung</span>}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  </div>

                  <div className="rounded-3xl border border-ink-200 bg-white p-6">
                    <h3 className="text-[15px] font-semibold text-ink-900">Perkiraan tunggu</h3>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl font-bold tracking-tight text-brand-700">{prediksi.estimasi}</span>
                      <span className="pb-1.5 text-sm text-ink-500">menit lagi</span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-ink-400">Rentang {prediksi.rentangMin}–{prediksi.rentangMax} menit · {prediksi.antrianDepan} pasien di depan Anda · keyakinan {prediksi.keyakinan}%</p>

                    <div className="mt-5 rounded-2xl bg-ink-50 p-4">
                      <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-400">Antrean {poli?.nama}</p>
                      <div className="flex flex-wrap gap-2">
                        {antre.map((a) => (
                          <span key={a.id} className={cn('rounded-lg px-2.5 py-1.5 text-[12px] font-semibold tabular-nums ring-1 ring-inset', a.id === hasil.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-600 ring-ink-200')}>
                            {a.kode}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {cabang && (
                        <a href={`tel:${cabang.telepon.replace(/\D/g, '')}`} className="flex items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2.5 text-[12.5px] font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-700">
                          <Phone size={14} /> {cabang.telepon}
                        </a>
                      )}
                      {(hasil.status === 'menunggu' || hasil.status === 'dipanggil') && (
                        <Tombol varian="bahaya" ukuran="kecil" onClick={batal} ikon="batal">Batalkan Antrian</Tombol>
                      )}
                      <Tombol varian="tepi" ukuran="kecil" onClick={() => window.print()} ikonKanan={<Printer size={13} />} className="print:hidden">Cetak</Tombol>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-ink-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink-900">Informasi kunjungan</h3>
                    <p className="mt-1 text-[12.5px] text-ink-400">{tanggalPanjang(hasil.ambilPada)} · {cabang?.nama}</p>
                  </div>
                  <Lencana className={cn('ring-1 ring-inset', LABEL_PRIORITAS[hasil.prioritas].latar)} titik={LABEL_PRIORITAS[hasil.prioritas].titik}>
                    Prioritas {LABEL_PRIORITAS[hasil.prioritas].label}
                  </Lencana>
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-4">
                  {[
                    { k: 'Poli', v: poli?.nama ?? '-', i: 'poli' },
                    { k: 'Ruang', v: poli?.ruang ?? '-', i: 'gedung' },
                    { k: 'Dokter', v: dokter?.nama.split(',')[0] ?? '-', i: 'dokter' },
                    { k: 'Keluhan', v: hasil.alasan || '-', i: 'folder' },
                  ].map((b) => (
                    <div key={b.k} className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400"><Ikon nama={b.i} ukuran={12} /> {b.k}</span>
                      <dd className="mt-1.5 truncate text-[13.5px] font-medium text-ink-800">{b.v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                  <Clock size={16} className="mt-0.5 shrink-0 text-brand-700" />
                  <p className="text-[12.5px] leading-relaxed text-brand-900/80">
                    Mohon hadir 10 menit sebelum perkiraan. Jika terlambat lebih dari 15 menit setelah nomor dipanggil,
                    nomor Anda akan dilewati dan diberikan kembali lewat layanan <span className="font-semibold">prioritas</span>.
                  </p>
                </div>
              </div>

              <div className="flex justify-center pb-6">
                <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition hover:text-brand-700">
                  <ArrowLeft size={14} /> Kembali ke beranda
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------- cari cepat */

export function CariAntrian({ onPilih }: { onPilih: (a: Antrian) => void }) {
  const db = pakaiDB()
  const [kueri, setKueri] = useState('')
  const hasil = db.antrian
    .filter((a) => a.kode.toUpperCase().includes(kueri.toUpperCase()) || a.pasienNama.toLowerCase().includes(kueri.toLowerCase()))
    .slice(0, 8)

  return (
    <div className="space-y-3">
      <Pilih
        label="Pilih nomor antrian"
        opsi={hasil.map((a) => ({ nilai: a.id, label: `${a.kode} · ${a.pasienNama}`, sub: db.poli.find((p) => p.id === a.poliId)?.nama, warna: db.poli.find((p) => p.id === a.poliId)?.warna }))}
        nilai=""
        onPilih={(v) => { const a = db.antrian.find((x) => x.id === v); if (a) onPilih(a) }}
        placeholder={kueri || 'Ketik kode atau nama pasien…'}
        carian
      />
      <input
        value={kueri}
        onChange={(e) => setKueri(e.target.value)}
        placeholder="Filter cepat: UMU-0, Budi…"
        className="h-10 w-full rounded-xl border border-ink-200 px-3.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 focus:outline-none"
      />
    </div>
  )
}
