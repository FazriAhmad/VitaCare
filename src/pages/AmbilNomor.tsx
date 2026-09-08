import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Star } from 'lucide-react'
import { Ikon } from '../components/Icon'
import { KartuTiket } from '../components/KartuTiket'
import { Kartu, Lencana, Masukan, Pilih, Tombol, gunakanToast } from '../components/ui'
import { ambilNomor, dokterPraktik, pakaiDB, pakaiPenggunaSesi } from '../lib/db'
import { prediksiTunggu } from '../lib/analytics'
import { cn, namaHari, validasiEmail } from '../lib/utils'
import type { Antrian, Prioritas } from '../lib/types'

const PRIORITAS: Array<{ id: Prioritas; label: string; deskripsi: string; ikon: string }> = [
  { id: 'reguler', label: 'Reguler', deskripsi: 'Urutan normal sesuai waktu ambil', ikon: 'pengguna' },
  { id: 'lansia', label: 'Lansia (60+)', deskripsi: 'Naik prioritas antrean', ikon: 'pengguna' },
  { id: 'hamil', label: 'Ibu Hamil', deskripsi: 'Naik prioritas antrean', ikon: 'hamil' },
  { id: 'difabel', label: 'Difabel', deskripsi: 'Naik prioritas antrean', ikon: 'difabel' },
  { id: 'darurat', label: 'Darurat', deskripsi: 'Dilayani lebih dahulu', ikon: 'darurat' },
]

export function AmbilNomor() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()
  const navigate = useNavigate()
  const { tampilkan } = gunakanToast()

  const [langkah, setLangkah] = useState(1)
  const [cabangId, setCabangId] = useState(sesi?.cabangId ?? db.cabang[0]?.id ?? '')
  const [poliId, setPoliId] = useState('')
  const [prioritas, setPrioritas] = useState<Prioritas>('reguler')
  const [nama, setNama] = useState(sesi?.nama ?? '')
  const [telepon, setTelepon] = useState(sesi?.telepon ?? '')
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState<Record<string, string>>({})
  const [hasil, setHasil] = useState<Antrian | null>(null)

  const poliTersedia = db.poli.filter((p) => p.aktif && p.cabangIds.includes(cabangId))
  const poliTerpilih = db.poli.find((p) => p.id === poliId)
  const dokter = poliTerpilih ? dokterPraktik(db, poliTerpilih.id, cabangId) : undefined
  const jadwalDokter = dokter ? db.jadwal.filter((j) => j.dokterId === dokter.id && j.cabangId === cabangId) : []

  const estimasi = useMemo(() => {
    if (!poliTerpilih) return null
    const antre = db.antrian.filter((a) => a.poliId === poliTerpilih.id && a.cabangId === cabangId && a.status !== 'selesai' && a.status !== 'batal').length
    const dasar = Math.max(2, Math.round(antre * poliTerpilih.rataLayanan * 0.8))
    const faktor = prioritas === 'reguler' ? 1 : 0.55
    return { antre, menit: Math.max(1, Math.round(dasar * faktor)) }
  }, [db.antrian, poliTerpilih, cabangId, prioritas])

  const kirim = async () => {
    const g: Record<string, string> = {}
    if (!poliId) g.poli = 'Pilih poli terlebih dahulu.'
    if (nama.trim().length < 3) g.nama = 'Nama lengkap minimal 3 karakter.'
    if (!sesi && !validasiEmail('x@y.co')) g.telepon = 'Nomor telepon tidak valid.'
    if (telepon.replace(/\D/g, '').length < 9) g.telepon = 'Nomor telepon minimal 9 digit.'
    setGalat(g)
    if (Object.keys(g).length) return

    try {
      const antrian = await ambilNomor({
        poliId,
        cabangId,
        nama,
        telepon,
        alasan: alasan || 'Konsultasi umum',
        prioritas,
        pasienId: sesi?.id,
      })
      setHasil(antrian)
      tampilkan('Nomor berhasil diambil', `${antrian.kode} — estimasi tunggu ${antrian.estimasiAwal} menit.`)
    } catch (err) {
      tampilkan('Gagal mengambil nomor', err instanceof Error ? err.message : 'Coba lagi.', 'galat')
    }
  }

  if (hasil) {
    return (
      <div className="min-h-screen bg-ink-50/70">
        <main className="mx-auto max-w-3xl px-5 py-12">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
              className="grad-teal mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg shadow-brand-600/30"
            >
              <Check size={30} className="text-white" strokeWidth={3} />
            </motion.span>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-950">Nomor antrian berhasil diambil</h1>
            <p className="mt-2 text-[14.5px] text-ink-500">Simpan tiket ini dan tunjukkan QR-nya saat nomor Anda dipanggil.</p>
          </motion.div>

          <div className="mt-8"><KartuTiket antrian={hasil} lengkap cetak={() => window.print()} /></div>

          <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
            <Link to={`/status?kode=${hasil.kode}`}><Tombol ukuran="besar" ikonKanan={<ArrowRight size={16} />}>Pantau Status</Tombol></Link>
            {sesi && <Link to="/app"><Tombol varian="tepi" ukuran="besar">Dasbor Saya</Tombol></Link>}
            <Tombol varian="tepi" ukuran="besar" onClick={() => { setHasil(null); setPoliId(''); setAlasan(''); setLangkah(1) }}>Ambil Nomor Lain</Tombol>
          </div>
        </main>
      </div>
    )
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
            <span className="text-[15px] font-semibold tracking-tight text-ink-900">Ambil Nomor Antrian</span>
          </Link>
          <div className="flex items-center gap-2 text-[12px] font-medium text-ink-400">
            {[1, 2, 3].map((n) => (
              <span key={n} className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors', langkah >= n ? 'grad-teal text-white' : 'bg-ink-100 text-ink-400')}>{n}</span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <AnimatePresence mode="wait">
          {/* langkah 1 */}
          {langkah === 1 && (
            <motion.div key="l1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <h1 className="text-xl font-semibold tracking-tight text-ink-900">Pilih cabang & poli</h1>
              <p className="mt-1.5 text-[13.5px] text-ink-500">Estimasi waktu tunggu ditampilkan langsung untuk setiap poli.</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {db.cabang.filter((c) => c.aktif).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCabangId(c.id); setPoliId('') }}
                    className={cn('flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left transition-all duration-200', cabangId === c.id ? 'border-brand-400 bg-brand-50 ring-4 ring-brand-500/10' : 'border-ink-200 bg-white hover:border-brand-200')}
                  >
                    <span className="h-8 w-1.5 rounded-full" style={{ background: c.warna }} />
                    <span>
                      <span className="block text-[13.5px] font-semibold text-ink-800">{c.nama}</span>
                      <span className="block text-[11.5px] text-ink-400">{c.kota}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {poliTersedia.map((p, i) => {
                  const antre = db.antrian.filter((a) => a.poliId === p.id && a.cabangId === cabangId && a.status !== 'selesai' && a.status !== 'batal').length
                  const menit = Math.max(2, Math.round(antre * p.rataLayanan * 0.8))
                  const ramai = antre > 6
                  return (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.35 }}
                      onClick={() => { setPoliId(p.id); setLangkah(2) }}
                      className={cn('group relative overflow-hidden rounded-2xl border bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1', poliId === p.id ? 'border-brand-400 ring-4 ring-brand-500/10' : 'border-ink-200 hover:shadow-[0_20px_45px_-28px_rgba(14,26,34,0.5)]')}
                    >
                      <span className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-[0.08] transition-transform duration-500 group-hover:scale-125" style={{ background: p.warna }} />
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${p.warna}18` }}>
                        <Ikon nama={p.ikon} ukuran={22} />
                      </span>
                      <h3 className="mt-3.5 text-[14.5px] font-semibold text-ink-900">{p.nama}</h3>
                      <p className="mt-1 text-[11.5px] text-ink-400">{p.ruang} · {p.lantai}</p>
                      <div className="mt-3.5 flex items-center justify-between">
                        <span className="text-[12px] font-medium text-ink-500">{antre} menunggu</span>
                        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', ramai ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-700')}>
                          ± {menit} mnt
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* langkah 2 */}
          {langkah === 2 && poliTerpilih && (
            <motion.div key="l2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <button onClick={() => setLangkah(1)} className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition hover:text-brand-700">
                <ArrowLeft size={14} /> Ganti poli
              </button>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <div className="space-y-5">
                  <Kartu className="p-6">
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${poliTerpilih.warna}18` }}>
                        <Ikon nama={poliTerpilih.ikon} ukuran={24} />
                      </span>
                      <div className="min-w-0">
                        <h1 className="text-lg font-semibold tracking-tight text-ink-900">{poliTerpilih.nama}</h1>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{poliTerpilih.deskripsi}</p>
                      </div>
                    </div>
                    <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                      {[
                        { k: 'Antre', v: `${estimasi?.antre ?? 0} orang` },
                        { k: 'Estimasi', v: `${estimasi?.menit ?? 0} mnt` },
                        { k: 'Layanan', v: `${poliTerpilih.rataLayanan} mnt` },
                      ].map((x) => (
                        <div key={x.k} className="rounded-xl bg-ink-50 py-3">
                          <dt className="text-[10.5px] uppercase tracking-wide text-ink-400">{x.k}</dt>
                          <dd className="mt-1 text-[14px] font-semibold text-ink-800">{x.v}</dd>
                        </div>
                      ))}
                    </dl>
                  </Kartu>

                  {dokter && (
                    <Kartu className="p-6">
                      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">Dokter jaga hari ini</p>
                      <div className="mt-4 flex items-center gap-4">
                        <img src={dokter.foto} alt={dokter.nama} className="h-14 w-14 rounded-2xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-semibold text-ink-900">{dokter.nama}</p>
                          <p className="truncate text-[12.5px] text-ink-500">{dokter.spesialis}</p>
                          <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-amber-600">
                            <Star size={12} fill="currentColor" /> {dokter.rating} <span className="font-normal text-ink-400">· SIP {dokter.sip}</span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {jadwalDokter.length === 0 && <span className="text-[12.5px] text-ink-400">Tidak ada jadwal praktik hari ini.</span>}
                        {jadwalDokter.slice(0, 4).map((j) => (
                          <Lencana key={j.id} className={cn('ring-1 ring-inset', j.hari === new Date().getDay() ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-ink-50 text-ink-500 ring-ink-200')}>
                            {namaHari(j.hari)} · {j.mulai}–{j.selesai}
                          </Lencana>
                        ))}
                      </div>
                    </Kartu>
                  )}
                </div>

                <div className="space-y-5">
                  <Kartu className="p-6">
                    <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">Status prioritas</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">Prioritas menentukan urutan panggilan. Pilih sesuai kondisi sebenarnya.</p>
                    <div className="mt-4 space-y-2">
                      {PRIORITAS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPrioritas(p.id)}
                          className={cn('flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200', prioritas === p.id ? 'border-brand-400 bg-brand-50 ring-4 ring-brand-500/10' : 'border-ink-200 bg-white hover:border-brand-200')}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white ring-1 ring-ink-100">
                            <Ikon nama={p.ikon} ukuran={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-semibold text-ink-800">{p.label}</span>
                            <span className="block truncate text-[11.5px] text-ink-400">{p.deskripsi}</span>
                          </span>
                          {prioritas === p.id && <Check size={16} className="shrink-0 text-brand-600" />}
                        </button>
                      ))}
                    </div>
                  </Kartu>

                  <Kartu className="p-6">
                    <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">Data pasien</p>
                    <div className="mt-4 space-y-3.5">
                      <Masukan label="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Sesuai KTP" ikon="pengguna" galat={galat.nama} />
                      <Masukan label="Nomor telepon" value={telepon} onChange={(e) => setTelepon(e.target.value)} placeholder="0812xxxxxxx" ikon="telepon" galat={galat.telepon} />
                      <Masukan label="Keluhan singkat" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="cth. Demam 3 hari" ikon="folder" />
                      {!sesi && (
                        <div className="rounded-xl bg-ink-50 p-3.5 text-[12px] leading-relaxed text-ink-500">
                          Masuk sebagai pasien agar tiket, riwayat, dan notifikasi tersimpan otomatis.{' '}
                          <Link to="/login" className="font-semibold text-brand-700">Masuk</Link>
                        </div>
                      )}
                    </div>
                    <div className="mt-5">
                      <Tombol lebar ukuran="besar" onClick={kirim} ikonKanan={<ArrowRight size={16} />}>Ambil Nomor Sekarang</Tombol>
                    </div>
                  </Kartu>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
