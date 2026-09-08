import { Link } from 'react-router-dom'
import { pakaiDB } from '../lib/db'

/** Kerangka halaman publik: bilah atas ringan + footer. */
export function PakaiShellPublik({ anak, children }: { anak?: React.ReactNode; children?: React.ReactNode }) {
  const db = pakaiDB()
  return (
    <div className="flex min-h-screen flex-col bg-ink-50/60">
      <header className="kaca sticky top-0 z-30 border-b border-ink-100">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
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
          <nav className="flex items-center gap-4 text-[13px] font-medium text-ink-500">
            <Link to="/status" className="transition hover:text-brand-700">Cek Antrian</Link>
            <Link to="/ambil" className="transition hover:text-brand-700">Ambil Nomor</Link>
            <Link to="/login" className="text-brand-700 transition hover:text-brand-800">Masuk</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{anak ?? children}</main>
      <footer className="border-t border-ink-100 bg-white py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 text-[12px] text-ink-400">
          <span>© 2026 {db.pengaturan.namaRs} · VitaCare</span>
          <Link to="/" className="transition hover:text-brand-700">Beranda</Link>
        </div>
      </footer>
    </div>
  )
}
