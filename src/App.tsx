import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Pemberitahuan, Spinner, Tombol, gunakanToast } from './components/ui'
import { AppShell } from './components/AppShell'
import { langganGalat, mulaiSinkronisasi, pakaiPenggunaSesi, pakaiSiap } from './lib/db'
import { boleh, labelPeran, type Izin } from './lib/permissions'
import type { Peran } from './lib/types'

import { Landing } from './pages/Landing'
import { Login, Register } from './pages/Auth'
import { StatusAntrian } from './pages/StatusAntrian'
import { AmbilNomor } from './pages/AmbilNomor'
import { PasienBeranda, PasienJanjiTemu, PasienPrivasi, PasienRiwayat } from './pages/Pasien'
import { DokterBeranda, DokterJadwal, DokterRiwayat } from './pages/Dokter'
import { PetugasAntrian, PetugasBeranda, PetugasJanjiTemu, PetugasQR } from './pages/Petugas'
import { AdminBeranda } from './pages/Admin'
import { AdminCabang, AdminDokter, AdminJadwal, AdminPoli } from './pages/AdminMaster'
import { AdminAudit, AdminLaporan, AdminPengaturan, AdminPengguna } from './pages/AdminSistem'
import { DisplayTV } from './pages/DisplayTV'
import { KebijakanPrivasi } from './pages/KebijakanPrivasi'
import { TidakDitemukan } from './pages/TidakDitemukan'

function Tolak({ peran, izin }: { peran?: Peran[]; izin?: Izin }) {
  const navigate = useNavigate()
  return (
    <AppShell judul="Akses Ditolak" sub="Anda tidak memiliki izin untuk halaman ini">
      <div className="mx-auto max-w-md rounded-3xl border border-ink-200 bg-white p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-xl">🔒</span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink-900">Izin tidak mencukupi</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
          Halaman ini khusus peran <span className="font-semibold text-ink-700">{peran?.map(labelPeran).join(' / ')}</span>
          {izin && <> atau memerlukan izin <span className="font-mono text-[12px] text-ink-700">{izin}</span></>}.
          Hubungi administrator untuk memberikan akses.
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          <Tombol varian="tepi" onClick={() => navigate(-1)}>Kembali</Tombol>
          <Tombol onClick={() => navigate('/')}>Beranda</Tombol>
        </div>
      </div>
    </AppShell>
  )
}

function Lindungi({ anak, peran, izin }: { anak: React.ReactNode; peran?: Peran[]; izin?: Izin }) {
  const pengguna = pakaiPenggunaSesi()
  const navigate = useNavigate()

  useEffect(() => {
    if (!pengguna) navigate('/login', { replace: true })
  }, [pengguna, navigate])

  if (!pengguna) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Spinner ukuran={30} />
      </div>
    )
  }
  if (peran && !peran.includes(pengguna.peran)) return <Tolak peran={peran} />
  if (izin && !boleh(pengguna, izin)) return <Tolak izin={izin} />
  return <>{anak}</>
}

function Rute() {
  return (
    <Routes>
      {/* publik */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/status" element={<StatusAntrian />} />
      <Route path="/ambil" element={<AmbilNomor />} />
      <Route path="/tv" element={<DisplayTV />} />
      <Route path="/kebijakan-privasi" element={<KebijakanPrivasi />} />

      {/* pasien */}
      <Route path="/app" element={<Lindungi anak={<PasienBeranda />} />} />
      <Route path="/app/janji-temu" element={<Lindungi anak={<PasienJanjiTemu />} />} />
      <Route path="/app/riwayat" element={<Lindungi anak={<PasienRiwayat />} izin="lihat_riwayat" />} />
      <Route path="/app/privasi" element={<Lindungi anak={<PasienPrivasi />} />} />

      {/* dokter */}
      <Route path="/dokter" element={<Lindungi anak={<DokterBeranda />} peran={['dokter', 'admin']} />} />
      <Route path="/dokter/riwayat" element={<Lindungi anak={<DokterRiwayat />} peran={['dokter', 'admin']} />} />
      <Route path="/dokter/jadwal" element={<Lindungi anak={<DokterJadwal />} peran={['dokter', 'admin']} />} />

      {/* petugas / loket */}
      <Route path="/petugas" element={<Lindungi anak={<PetugasBeranda />} izin="lihat_dashboard" />} />
      <Route path="/petugas/antrian" element={<Lindungi anak={<PetugasAntrian />} izin="kelola_antrian" />} />
      <Route path="/petugas/qr" element={<Lindungi anak={<PetugasQR />} izin="kelola_antrian" />} />
      <Route path="/petugas/janji-temu" element={<Lindungi anak={<PetugasJanjiTemu />} izin="kelola_janji_temu" />} />

      {/* admin */}
      <Route path="/admin" element={<Lindungi anak={<AdminBeranda />} izin="lihat_statistik" />} />
      <Route path="/admin/analitik" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/dokter" element={<Lindungi anak={<AdminDokter />} izin="kelola_dokter" />} />
      <Route path="/admin/poli" element={<Lindungi anak={<AdminPoli />} izin="kelola_poli" />} />
      <Route path="/admin/jadwal" element={<Lindungi anak={<AdminJadwal />} izin="kelola_jadwal" />} />
      <Route path="/admin/cabang" element={<Lindungi anak={<AdminCabang />} izin="kelola_cabang" />} />
      <Route path="/admin/pengguna" element={<Lindungi anak={<AdminPengguna />} izin="kelola_pengguna" />} />
      <Route path="/admin/laporan" element={<Lindungi anak={<AdminLaporan />} izin="lihat_statistik" />} />
      <Route path="/admin/audit" element={<Lindungi anak={<AdminAudit />} izin="lihat_audit" />} />
      <Route path="/admin/pengaturan" element={<Lindungi anak={<AdminPengaturan />} izin="ubah_pengaturan" />} />

      <Route path="*" element={<TidakDitemukan />} />
    </Routes>
  )
}

function GalatGlobal() {
  const { tampilkan } = gunakanToast()
  useEffect(() => langganGalat((pesan) => tampilkan('Gagal terhubung ke server', pesan, 'galat')), [tampilkan])
  return null
}

export default function App() {
  const siap = pakaiSiap()
  useEffect(() => mulaiSinkronisasi(), [])

  if (!siap) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Spinner ukuran={30} />
      </div>
    )
  }

  return (
    <Pemberitahuan>
      <GalatGlobal />
      <HashRouter>
        <Rute />
      </HashRouter>
    </Pemberitahuan>
  )
}
