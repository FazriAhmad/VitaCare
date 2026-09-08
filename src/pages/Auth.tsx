import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Masukan, Sakelar, Tombol, gunakanToast } from '../components/ui'
import { masuk, daftar, pakaiPenggunaSesi, simpanPengaturan } from '../lib/db'
import { PERAN } from '../lib/permissions'
import { validasiEmail } from '../lib/utils'

const DEMO = [
  { peran: 'admin', email: 'admin@vitacare.id', sandi: 'admin123' },
  { peran: 'petugas', email: 'petugas@vitacare.id', sandi: 'petugas123' },
  { peran: 'dokter', email: 'dokter@vitacare.id', sandi: 'dokter123' },
  { peran: 'pasien', email: 'pasien@vitacare.id', sandi: 'pasien123' },
]

export function Login() {
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [lihat, setLihat] = useState(false)
  const [memuat, setMemuat] = useState(false)
  const [galat, setGalat] = useState('')
  const navigate = useNavigate()
  const { tampilkan } = gunakanToast()
  const [param] = useSearchParams()
  const pengguna = pakaiPenggunaSesi()

  useEffect(() => {
    const isi = param.get('isi')
    if (isi) setEmail(isi)
  }, [param])

  useEffect(() => {
    if (!pengguna) return
    const tujuan = pengguna.peran === 'admin' ? '/admin' : pengguna.peran === 'petugas' ? '/petugas' : pengguna.peran === 'dokter' ? '/dokter' : '/app'
    navigate(tujuan, { replace: true })
  }, [pengguna, navigate])

  const kirim = (e: React.FormEvent) => {
    e.preventDefault()
    setGalat('')
    if (!validasiEmail(email)) return setGalat('Format email tidak valid.')
    if (sandi.length < 5) return setGalat('Kata sandi minimal 5 karakter.')
    setMemuat(true)
    window.setTimeout(() => {
      const hasil = masuk(email, sandi)
      setMemuat(false)
      if (!hasil.ok) setGalat(hasil.pesan)
      else tampilkan('Berhasil masuk', hasil.pesan)
    }, 520)
  }

  const isiDemo = (d: (typeof DEMO)[number]) => {
    setEmail(d.email)
    setSandi(d.sandi)
    setGalat('')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* panel kiri */}
      <div className="grad-ink relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="bintik absolute inset-0 opacity-30" />
        <img src="/img/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.13] mix-blend-luminosity" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2.5 self-start">
          <span className="grad-teal flex h-10 w-10 items-center justify-center rounded-xl">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l2-5 3.5 11L15 10l1.6 2H21" />
            </svg>
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight text-white">VitaCare</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-brand-300">Sistem Antrian RS</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-white">
            Satu layar untuk<br />seluruh alur antrian.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/55">
            Pantau nomor antrian, panggil pasien, dan kelola jadwal praktik dari satu dasbor yang tersinkron realtime.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {['Realtime', 'QR Tiket', 'Display TV', 'Prediksi Tunggu', 'Audit Log'].map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-white/65">{t}</span>
            ))}
          </div>
        </div>

        <p className="relative text-[12px] text-white/30">© 2026 VitaCare. Data disimpan lokal di peramban Anda.</p>
      </div>

      {/* panel kanan */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition hover:text-brand-700">
            <ArrowLeft size={15} /> Kembali ke beranda
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-ink-950">Masuk ke VitaCare</h1>
          <p className="mt-2 text-[14px] text-ink-500">Gunakan akun yang terdaftar untuk melanjutkan.</p>

          <form onSubmit={kirim} className="mt-8 space-y-4">
            <Masukan
              label="Alamat email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@vitacare.id"
              ikon="mail"
              autoComplete="email"
            />
            <Masukan
              label="Kata sandi"
              type={lihat ? 'text' : 'password'}
              value={sandi}
              onChange={(e) => setSandi(e.target.value)}
              placeholder="••••••••"
              ikon="pengguna"
              galat={galat || undefined}
              autoComplete="current-password"
              ikonKanan={
                <button type="button" onClick={() => setLihat((v) => !v)} className="text-ink-400 transition hover:text-ink-700">
                  {lihat ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <div className="flex items-center justify-between pt-1">
              <Sakelar kecil label="Ingat saya" aktif onUbah={() => undefined} />
              <button type="button" onClick={() => { setEmail('admin@vitacare.id'); setSandi('admin123') }} className="text-[12.5px] font-medium text-brand-700 hover:text-brand-800">
                Lupa sandi?
              </button>
            </div>
            <Tombol type="submit" lebar ukuran="besar" memuat={memuat}>Masuk</Tombol>
          </form>

          <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">Akun demo — klik untuk mengisi</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.peran}
                  type="button"
                  onClick={() => isiDemo(d)}
                  className="rounded-xl border border-ink-200 px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <span className="block text-[12.5px] font-semibold text-ink-800">{PERAN.find((p) => p.id === d.peran)?.label}</span>
                  <span className="block truncate text-[11px] text-ink-400">{d.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-[13.5px] text-ink-500">
            Belum punya akun?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">Daftar sebagai pasien</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export function Register() {
  const [form, setForm] = useState({ nama: '', email: '', sandi: '', ulangi: '', telepon: '', nik: '', cabangId: '' })
  const [galat, setGalat] = useState<Record<string, string>>({})
  const [memuat, setMemuat] = useState(false)
  const navigate = useNavigate()
  const { tampilkan } = gunakanToast()
  const db = pakaiPenggunaSesi()

  useEffect(() => {
    if (db) navigate('/app', { replace: true })
  }, [db, navigate])

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const kirim = (e: React.FormEvent) => {
    e.preventDefault()
    const g: Record<string, string> = {}
    if (form.nama.trim().length < 3) g.nama = 'Nama lengkap minimal 3 karakter.'
    if (!validasiEmail(form.email)) g.email = 'Format email tidak valid.'
    if (form.sandi.length < 6) g.sandi = 'Kata sandi minimal 6 karakter.'
    if (form.sandi !== form.ulangi) g.ulangi = 'Konfirmasi sandi tidak sama.'
    if (form.telepon.replace(/\D/g, '').length < 9) g.telepon = 'Nomor telepon tidak valid.'
    setGalat(g)
    if (Object.keys(g).length) return

    setMemuat(true)
    window.setTimeout(() => {
      const hasil = daftar({
        nama: form.nama,
        email: form.email,
        sandi: form.sandi,
        telepon: form.telepon,
        nik: form.nik,
        cabangId: form.cabangId || 'cbg_jkt',
      })
      setMemuat(false)
      if (!hasil.ok) setGalat({ email: hasil.pesan })
      else {
        tampilkan('Pendaftaran berhasil', 'Anda kini dapat mengambil nomor antrian.')
        navigate('/ambil')
      }
    }, 480)
  }

  return (
    <div className="min-h-screen bg-ink-50/60">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition hover:text-brand-700">
          <ArrowLeft size={15} /> Kembali
        </Link>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="grad-teal inline-flex h-12 w-12 items-center justify-center rounded-2xl">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l2-5 3.5 11L15 10l1.6 2H21" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-950">Registrasi Pasien VitaCare</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            Satu akun untuk mengambil nomor, membuat janji temu, dan melacak riwayat kunjungan di seluruh cabang.
          </p>

          <form onSubmit={kirim} className="mt-8 space-y-4 rounded-3xl border border-ink-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(14,26,34,0.5)]">
            <Masukan label="Nama lengkap" value={form.nama} onChange={(e) => set('nama')(e.target.value)} placeholder="cth. Budi Santoso" ikon="pengguna" galat={galat.nama} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Masukan label="Email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} placeholder="nama@email.com" ikon="mail" galat={galat.email} />
              <Masukan label="Nomor telepon" value={form.telepon} onChange={(e) => set('telepon')(e.target.value)} placeholder="0812xxxxxxx" ikon="telepon" galat={galat.telepon} />
            </div>
            <Masukan label="NIK (opsional)" value={form.nik} onChange={(e) => set('nik')(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="16 digit NIK" petunjuk="Digunakan untuk rekam medis" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Masukan label="Kata sandi" type="password" value={form.sandi} onChange={(e) => set('sandi')(e.target.value)} placeholder="minimal 6 karakter" galat={galat.sandi} />
              <Masukan label="Ulangi sandi" type="password" value={form.ulangi} onChange={(e) => set('ulangi')(e.target.value)} placeholder="ketik ulang" galat={galat.ulangi} />
            </div>
            <div className="rounded-2xl bg-brand-50/70 p-4">
              <p className="text-[12px] font-medium text-brand-800">
                Setelah mendaftar, Anda langsung masuk dan dapat mengambil nomor antrian tanpa antre di loket.
              </p>
            </div>
            <Tombol type="submit" lebar ukuran="besar" memuat={memuat}>Buat Akun Pasien</Tombol>
            <p className="text-center text-[13px] text-ink-500">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">Masuk di sini</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
