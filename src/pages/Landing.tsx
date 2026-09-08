import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, QrCode, Shield, TrendingUp, Tv } from 'lucide-react'
import { Ikon } from '../components/Icon'
import { Kartu, Lencana, Tombol } from '../components/ui'
import { PapanAntrian } from '../components/PapanAntrian'
import { pakaiDB, panggilanTerakhir } from '../lib/db'
import { kpi } from '../lib/analytics'
import { angkaRibuan } from '../lib/utils'
import { AngkaAnimasi } from '../components/charts'

const FITUR = [
  {
    grup: 'V1 · Dasar',
    ikon: 'daftar',
    items: ['Login & registrasi pasien', 'Master dokter, poli & jadwal', 'Ambil nomor antrian', 'Panggil antrian petugas', 'CRUD dokter dan poli'],
  },
  {
    grup: 'V2 · Profesional',
    ikon: 'grafik',
    items: ['Antrian realtime antar-perangkat', 'QR code pada tiket', 'Display TV ruang tunggu', 'Notifikasi & riwayat', 'Statistik + peran & izin'],
  },
  {
    grup: 'V3 · Lanjutan',
    ikon: 'analitik',
    items: ['Janji temu & multi cabang', 'Prioritas (darurat/lansia/hamil)', 'Prediksi waktu tunggu', 'Ekspor laporan & audit log', 'Kanal realtime gaya WebSocket'],
  },
]

export function Landing() {
  const db = pakaiDB()
  const statistik = kpi(db)
  const cabang = db.cabang[0]

  return (
    <div className="min-h-screen bg-white">
      {/* ---------------------------------------------------------- navigasi */}
      <header className="kaca sticky top-0 z-40 border-b border-ink-100/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grad-teal flex h-9 w-9 items-center justify-center rounded-xl">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l2-5 3.5 11L15 10l1.6 2H21" />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight text-ink-900">VitaCare</span>
              <span className="block text-[9.5px] font-medium uppercase tracking-[0.2em] text-brand-600">Sistem Antrian RS</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-ink-500 md:flex">
            <a href="#fitur" className="transition hover:text-brand-700">Fitur</a>
            <a href="#poli" className="transition hover:text-brand-700">Poli</a>
            <a href="#demo" className="transition hover:text-brand-700">Akun Demo</a>
            <Link to="/tv" className="transition hover:text-brand-700">Display TV</Link>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link to="/status"><Tombol varian="tepi" ukuran="kecil">Cek Antrian</Tombol></Link>
            <Link to="/login"><Tombol ukuran="kecil" ikonKanan={<ArrowRight size={14} />}>Masuk</Tombol></Link>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div className="bintik absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rounded-full bg-brand-100/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:px-8 lg:pt-20">
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Lencana className="bg-brand-50 text-brand-700 ring-brand-200" titik="bg-brand-500">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> {statistik.menunggu} pasien sedang menunggu hari ini</span>
              </Lencana>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 text-[clamp(2.4rem,5.6vw,4.1rem)] font-bold leading-[1.05] tracking-[-0.03em] text-ink-950"
            >
              Antrian rumah sakit<br />
              tanpa <span className="teks-grad">berdiri mengantre</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-ink-500"
            >
              VitaCare menyatukan pengambilan nomor, pemanggilan realtime, prediksi waktu tunggu, dan display TV
              dalam satu platform — untuk pasien, dokter, petugas loket, dan manajemen.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }} className="mt-8 flex flex-wrap gap-3">
              <Link to="/ambil"><Tombol ukuran="besar" ikon="tiket" ikonKanan={<ArrowRight size={17} />}>Ambil Nomor Sekarang</Tombol></Link>
              <Link to="/login"><Tombol varian="tepi" ukuran="besar" ikon="masuk">Masuk sebagai Petugas</Tombol></Link>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-ink-100 pt-8"
            >
              {[
                { k: 'Kunjungan hari ini', v: statistik.hariIni },
                { k: 'Rata-rata tunggu', v: statistik.rataTunggu, s: ' mnt' },
                { k: 'Tingkat selesai', v: statistik.tingkatSelesai, s: '%' },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-400">{s.k}</dt>
                  <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
                    <AngkaAnimasi nilai={s.v} akhiran={s.s ?? ''} />
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
            <div className="relative overflow-hidden rounded-[28px] border border-ink-200/70 shadow-[0_40px_90px_-45px_rgba(14,26,34,0.6)]">
              <img src="/img/hero.jpg" alt="Lobi pendaftaran rumah sakit VitaCare" className="h-[420px] w-full object-cover lg:h-[520px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-ink-950/70 p-4 backdrop-blur-md">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-brand-300">Sedang dipanggil</p>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <p className="nomor-antrian text-4xl font-bold text-white">{panggilanTerakhir(db, cabang?.id)?.kode ?? db.poli[0]?.kode + '-01'}</p>
                  <p className="pb-1 text-xs text-white/60">
                    {(() => {
                      const p = db.poli.find((x) => x.id === panggilanTerakhir(db, cabang?.id)?.poliId) ?? db.poli[0]
                      return `${p?.nama} · ${p?.ruang}`
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-4 top-8 hidden rounded-2xl border border-ink-200/70 bg-white p-4 shadow-xl sm:block"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50"><Ikon nama="qr" ukuran={22} /></span>
                <div>
                  <p className="text-[12.5px] font-semibold text-ink-900">Tiket ber-QR</p>
                  <p className="text-[11px] text-ink-400">Pindai saat dipanggil</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -right-3 bottom-24 hidden rounded-2xl border border-ink-200/70 bg-white p-4 shadow-xl sm:block"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><Ikon nama="kalender" ukuran={22} /></span>
                <div>
                  <p className="text-[12.5px] font-semibold text-ink-900">Prediksi 12 mnt</p>
                  <p className="text-[11px] text-ink-400">Akurasi {statistik.tingkatSelesai}%</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ fitur */}
      <section id="fitur" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-600">Kemampuan platform</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-ink-950 sm:text-4xl">Dari loket pendaftaran hingga ruang direktur</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            Tiga lapis kemampuan yang saling terhubung — seluruh data tersimpan lokal di peramban Anda, tanpa basis data eksternal.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FITUR.map((f, i) => (
            <motion.div key={f.grup} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, delay: i * 0.08 }}>
              <Kartu className="h-full p-6">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50"><Ikon nama={f.ikon} ukuran={22} /></span>
                <h3 className="text-base font-semibold tracking-tight text-ink-900">{f.grup}</h3>
                <ul className="mt-4 space-y-2.5">
                  {f.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-600">
                      <Check size={15} className="mt-0.5 shrink-0 text-brand-600" /> {it}
                    </li>
                  ))}
                </ul>
              </Kartu>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { ikon: 'qr', judul: 'QR Code Tiket', pesan: 'Setiap nomor antrian membawa QR unik yang dapat dipindai petugas loket.' },
            { ikon: 'tv', judul: 'Display TV', pesan: 'Papan panggilan fullscreen untuk ruang tunggu, sinkron realtime.' },
            { ikon: 'analitik', judul: 'Prediksi Tunggu', pesan: 'Model beban antre × layu pelayanan, disesuaikan prioritas & jadwal.' },
            { ikon: 'audit', judul: 'Audit Log', pesan: 'Setiap aksi tercatat lengkap dengan aktor, waktu, dan perinciannya.' },
          ].map((k, i) => (
            <motion.div key={k.judul} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.06 }}>
              <Kartu className="h-full p-5">
                <div className="flex items-center gap-2.5">
                  <Ikon nama={k.ikon} ukuran={18} />
                  <h4 className="text-[14px] font-semibold text-ink-900">{k.judul}</h4>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{k.pesan}</p>
              </Kartu>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- poli */}
      <section id="poli" className="bg-ink-50/60 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-600">Poli aktif</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-ink-950">Layanan {db.poli.filter((p) => p.aktif).length} poli di {db.cabang.length} cabang</h2>
            </div>
            <Link to="/ambil" className="text-[13.5px] font-semibold text-brand-700 transition hover:text-brand-800">Lihat semua & ambil nomor →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {db.poli.filter((p) => p.aktif).map((p, i) => {
              const menunggu = db.antrian.filter((a) => a.poliId === p.id && a.status === 'menunggu').length
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: (i % 5) * 0.05 }}>
                  <Kartu className="h-full p-5 transition-transform duration-300 hover:-translate-y-1">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${p.warna}18` }}>
                      <Ikon nama={p.ikon} ukuran={22} />
                    </span>
                    <h4 className="mt-3.5 text-[14px] font-semibold text-ink-900">{p.nama}</h4>
                    <p className="mt-1 text-[11.5px] text-ink-400">{p.ruang} · {p.lantai}</p>
                    <p className="mt-3 text-[12.5px] font-medium" style={{ color: p.warna }}>{menunggu} menunggu</p>
                  </Kartu>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- tampilan tv */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-600">Display TV realtime</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-ink-950">Papan panggilan yang menyala bersama loket</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            Buka di layar besar ruang tunggu. Saat petugas memanggil nomor, papan ini berpindah halus dalam hitungan milidetik.
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-ink-900/30 shadow-[0_40px_90px_-50px_rgba(14,26,34,0.8)]">
          <PapanAntrian cabangId={cabang?.id ?? 'cbg_jkt'} ringkas />
        </div>
      </section>

      {/* ------------------------------------------------------------- demo */}
      <section id="demo" className="bg-ink-950 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-300">Coba langsung</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em]">Masuk dengan peran apa pun</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/55">
              Empat peran dengan perizinan berbeda. Semua perubahan tersinkron antar tab — buka Display TV di tab terpisah
              untuk melihat pemanggilan realtime.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[12.5px]">
              {[Shield, QrCode, Tv, TrendingUp].map((Ic, i) => (
                <span key={i} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-white/70">
                  <Ic size={14} className="text-brand-300" />
                  {['Peran & izin', 'QR code', 'Display TV', 'Analitik'][i]}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { email: 'admin@vitacare.id', sandi: 'admin123', nama: 'Rina Kartika', peran: 'Administrator', latar: 'from-brand-500/20 to-brand-900/40' },
              { email: 'petugas@vitacare.id', sandi: 'petugas123', nama: 'Dewi Lestari', peran: 'Petugas Loket', latar: 'from-blue-500/20 to-blue-900/40' },
              { email: 'dokter@vitacare.id', sandi: 'dokter123', nama: 'dr. Andi Wijaya', peran: 'Dokter', latar: 'from-amber-500/20 to-amber-900/40' },
              { email: 'pasien@vitacare.id', sandi: 'pasien123', nama: 'Budi Santoso', peran: 'Pasien', latar: 'from-ink-500/20 to-ink-900/40' },
            ].map((a) => (
              <Link key={a.email} to={`/login?isi=${encodeURIComponent(a.email)}`} className={`group rounded-2xl border border-white/10 bg-gradient-to-br ${a.latar} p-5 transition hover:border-brand-400/40`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">{a.peran}</p>
                <p className="mt-2 text-[15px] font-semibold">{a.nama}</p>
                <p className="mt-1 text-[12px] text-white/45">{a.email}</p>
                <p className="mt-3 text-[11.5px] text-white/35">sandi: {a.sandi}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-300 opacity-0 transition group-hover:opacity-100">
                  Masuk <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- footer */}
      <footer className="border-t border-ink-100 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grad-teal flex h-9 w-9 items-center justify-center rounded-xl">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l2-5 3.5 11L15 10l1.6 2H21" />
              </svg>
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-ink-900">VitaCare · {db.pengaturan.namaRs}</p>
              <p className="text-[12px] text-ink-400">{angkaRibuan(db.antrian.length)} catatan antrian tercatat lokal · {db.dokter.length} dokter · {db.cabang.length} cabang</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-[12.5px] text-ink-400">
            <Link to="/status" className="transition hover:text-brand-700">Cek status</Link>
            <Link to="/tv" className="transition hover:text-brand-700">Display TV</Link>
            <Link to="/register" className="transition hover:text-brand-700">Registrasi</Link>
            <a href="https://www.flaticon.com/" target="_blank" rel="noreferrer" className="transition hover:text-brand-700">Ikon oleh Flaticon</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
