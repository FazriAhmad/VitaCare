import { Link } from 'react-router-dom'
import { Tombol } from '../components/ui'
import { PakaiShellPublik } from './ShellPublik'

export function TidakDitemukan() {
  return (
    <PakaiShellPublik>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
        <p className="nomor-antrian text-[7rem] font-bold leading-none text-brand-100">404</p>
        <h1 className="-mt-4 text-2xl font-semibold tracking-tight text-ink-900">Halaman tidak ditemukan</h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-500">
          Halaman yang Anda tuju tidak tersedia atau telah dipindahkan. Kembali ke beranda untuk melanjutkan.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/"><Tombol ikonKanan={<span>→</span>}>Kembali ke Beranda</Tombol></Link>
          <Link to="/status"><Tombol varian="tepi">Cek Status Antrian</Tombol></Link>
        </div>
      </div>
    </PakaiShellPublik>
  )
}
