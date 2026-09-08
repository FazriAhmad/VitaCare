import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PapanAntrian } from '../components/PapanAntrian'
import { tampilkanCabang } from '../components/AppShell'
import { pakaiDB } from '../lib/db'

export function DisplayTV() {
  const db = pakaiDB()
  const cabangId = tampilkanCabang() || db.cabang[0]?.id || ''

  return (
    <div className="relative min-h-screen bg-ink-950">
      <PapanAntrian cabangId={cabangId} />
      <Link
        to="/"
        className="fixed left-5 top-5 z-50 flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-medium text-white/70 backdrop-blur transition hover:bg-white/20 hover:text-white"
      >
        <ArrowLeft size={14} /> Kembali
      </Link>
    </div>
  )
}
