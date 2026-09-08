import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Pause, Volume2 } from 'lucide-react'
import { Ikon } from '../components/Icon'
import { AppShell, KartuSorotan } from '../components/AppShell'
import { AngkaAnimasi, Progres, useTick } from '../components/charts'
import { Kartu, Kosong, Lencana, Modal, Pilih, Tab, Tombol, gunakanToast } from '../components/ui'
import {
  LABEL_PRIORITAS, LABEL_STATUS, pakaiDB, pakaiPenggunaSesi, panggilAntrian, panggilBerikutnya,
  ubahStatusAntrian, urutAntrian,
} from '../lib/db'
import { prediksiTunggu } from '../lib/analytics'
import { cn, jam, namaHari, selisihMenit, tanggalPanjang } from '../lib/utils'
import type { Antrian, Prioritas } from '../lib/types'

export function DokterBeranda() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  useTick(12000)
  const { tampilkan } = gunakanToast()

  const dokter = db.dokter.find((d) => d.email === sesi.email) ?? db.dokter[0]
  const poli = db.poli.find((p) => p.id === dokter.poliId)
  const hari = new Date().getDay()
  const jadwalHariIni = db.jadwal.filter((j) => j.dokterId === dokter.id && j.hari === hari)

  const antre = db.antrian
    .filter((a) => a.dokterId === dokter.id && (a.status === 'menunggu' || a.status === 'dipanggil' || a.status === 'dilayani'))
    .sort(urutAntrian)

  const dilayani = antre.find((a) => a.status === 'dilayani')
  const dipanggil = antre.find((a) => a.status === 'dipanggil')
  const selesaiHari = db.antrian.filter((a) => a.dokterId === dokter.id && a.status === 'selesai' && a.selesaiPada?.slice(0, 10) === new Date().toISOString().slice(0, 10))
  const rataLayan = selesaiHari.length && selesaiHari[0].dipanggilPada
    ? Math.round(selesaiHari.reduce((s, a) => s + (a.dipanggilPada && a.selesaiPada ? selisihMenit(a.dipanggilPada, a.selesaiPada) : 0), 0) / selesaiHari.length)
    : 0

  const panggil = () => {
    const a = panggilBerikutnya(poli?.id ?? '', db.cabang[0].id)
    if (!a) return tampilkan('Antrean kosong', 'Tidak ada pasien menunggu di poli ini.', 'peringatan')
    tampilkan('Memanggil ' + a.kode, `${a.pasienNama} silakan menuju ${poli?.ruang}`)
  }

  const lanjut = (a: Antrian) => {
    ubahStatusAntrian(a.id, 'dilayani')
    tampilkan('Pemeriksaan dimulai', `${a.kode} — ${a.pasienNama}`)
  }

  const selesaikan = (a: Antrian) => {
    ubahStatusAntrian(a.id, 'selesai', 'Selesai diperiksa')
    tampilkan('Pelayanan selesai', `${a.kode} telah selesai.`)
  }

  const layanan = dipanggil ?? dilayani

  return (
    <AppShell judul="Ruang Periksa" sub={`${poli?.nama ?? '-'} · ${poli?.ruang ?? ''} · ${namaHari(hari)}`}>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* panel panggil */}
        <div className="space-y-4">
          <Kartu className="relative overflow-hidden p-6">
            <div className="bintik absolute inset-0 opacity-40" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Pasien aktif</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink-900">{dokter.nama}</h2>
                  <p className="text-[13px] text-ink-500">{dokter.spesialis}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {jadwalHariIni.map((j) => (
                    <Lencana key={j.id} className="bg-brand-50 text-brand-700 ring-brand-200">{j.mulai}–{j.selesai}</Lencana>
                  ))}
                  {jadwalHariIni.length === 0 && <Lencana className="bg-amber-50 text-amber-700 ring-amber-200">Libur</Lencana>}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {layanan ? (
                  <motion.div key={layanan.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="mt-6">
                    <div className="rounded-2xl border border-ink-100 bg-ink-50/70 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="nomor-antrian text-4xl font-bold text-ink-950">{layanan.kode}</p>
                          <p className="mt-1 truncate text-[14px] font-medium text-ink-700">{layanan.pasienNama}</p>
                          <p className="mt-0.5 text-[12.5px] text-ink-500">{layanan.alasan} · masuk {jam(layanan.ambilPada)}</p>
                        </div>
                        <div className="text-right">
                          <Lencana className={cn('ring-1 ring-inset', LABEL_PRIORITAS[layanan.prioritas].latar)} titik={LABEL_PRIORITAS[layanan.prioritas].titik}>{LABEL_PRIORITAS[layanan.prioritas].label}</Lencana>
                          <p className="mt-2 text-[12px] text-ink-400">{layanan.status === 'dipanggil' ? 'Menunggu masuk' : `Diperiksa ${jam(layanan.dilayaniPada!)}`}</p>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2.5">
                        {layanan.status === 'dipanggil' && (
                          <Tombol onClick={() => lanjut(layanan)} ikon="dokter">Mulai Pemeriksaan</Tombol>
                        )}
                        <Tombol varian="lembut" onClick={() => selesaikan(layanan)} ikon="centang">Selesai & Lanjut</Tombol>
                        <Tombol varian="tepi" onClick={() => ubahStatusAntrian(layanan.id, 'batal', 'Rujuk / tidak jadi')} ikon="batal">Batal / Rujuk</Tombol>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="kosong" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 rounded-2xl border border-dashed border-ink-200 p-8 text-center">
                    <p className="text-[14px] font-medium text-ink-600">Tidak ada pasien dalam pemeriksaan</p>
                    <p className="mt-1 text-[12.5px] text-ink-400">{antre.length} pasien menunggu giliran Anda</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Tombol ukuran="besar" onClick={panggil} ikon="pengumuman" ikonKanan={<Volume2 size={16} />}>
                  Panggil Berikutnya
                </Tombol>
                <span className="text-[12.5px] text-ink-400">Nomor dipanggil akan muncul di Display TV</span>
              </div>
            </div>
          </Kartu>

          <Kartu className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink-900">Antrean poli saya</h3>
              <span className="text-[12.5px] text-ink-400">{antre.length} pasien</span>
            </div>
            <div className="max-h-[26rem] overflow-y-auto">
              <AnimatePresence initial={false}>
                {antre.map((a, i) => (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className={cn('flex flex-wrap items-center gap-3 border-b border-ink-50 px-5 py-3.5 last:border-0', a.status === 'dipanggil' && 'bg-blue-50/60', a.status === 'dilayani' && 'bg-amber-50/60')}
                  >
                    <span className="w-6 text-center text-[12px] font-semibold tabular-nums text-ink-300">{i + 1}</span>
                    <span className="nomor-antrian w-[4.6rem] text-[15px] font-bold text-ink-900">{a.kode}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink-800">{a.pasienNama}</p>
                      <p className="truncate text-[11.5px] text-ink-400">± {prediksiTunggu(db, a).estimasi} mnt · {a.alasan}</p>
                    </div>
                    <Lencana className={cn('hidden shrink-0 ring-1 ring-inset sm:inline-flex', LABEL_PRIORITAS[a.prioritas].latar)} titik={LABEL_PRIORITAS[a.prioritas].titik}>{LABEL_PRIORITAS[a.prioritas].label}</Lencana>
                    <div className="flex shrink-0 gap-1.5">
                      {a.status === 'menunggu' && <Tombol varian="lembut" ukuran="kecil" onClick={() => panggilAntrian(a.id)}>Panggil</Tombol>}
                      {a.status === 'dipanggil' && <Tombol varian="lembut" ukuran="kecil" onClick={() => lanjut(a)}>Periksa</Tombol>}
                      {(a.status === 'dilayani' || a.status === 'dipanggil') && <Tombol varian="tepi" ukuran="kecil" onClick={() => selesaikan(a)} ikonKanan={<Check size={13} />}>Selesai</Tombol>}
                      <Tombol varian="tepi" ukuran="kecil" onClick={() => ubahStatusAntrian(a.id, 'batal')} className="hidden sm:inline-flex" ikonKanan={<Pause size={13} />}>Lewati</Tombol>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {antre.length === 0 && <Kosong ikon="daftar" judul="Antrean bersih" pesan="Semua pasien poli ini telah dilayani." />}
            </div>
          </Kartu>
        </div>

        {/* statistik dokter */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <KartuSorotan judul="Dilayani hari ini" nilai={<AngkaAnimasi nilai={selesaiHari.length} />} sub={`${antre.length} menunggu`} ikon="centang" warna="#0c8672" />
            <KartuSorotan judul="Rata-rata layan" nilai={<><AngkaAnimasi nilai={rataLayan} /><span className="text-sm font-medium text-ink-400"> mnt</span></>} sub="per pasien" ikon="jam" warna="#3b82f6" />
          </div>

          <Kartu className="p-6">
            <h3 className="text-[15px] font-semibold text-ink-900">Kapasitas jadwal hari ini</h3>
            <div className="mt-4 space-y-4">
              {jadwalHariIni.length === 0 && <p className="text-[12.5px] text-ink-400">Tidak ada jadwal praktik hari ini.</p>}
              {jadwalHariIni.map((j) => {
                const dipakai = db.antrian.filter((a) => a.dokterId === dokter.id && a.ambilPada.slice(0, 10) === new Date().toISOString().slice(0, 10)).length
                return (
                  <div key={j.id}>
                    <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                      <span className="font-medium text-ink-700">{j.mulai} – {j.selesai}</span>
                      <span className="text-ink-400">{Math.min(dipakai, j.kuota)}/{j.kuota} kuota</span>
                    </div>
                    <Progres nilai={Math.min(dipakai, j.kuota)} maks={j.kuota} />
                  </div>
                )
              })}
            </div>
          </Kartu>

          <Kartu className="p-6">
            <h3 className="text-[15px] font-semibold text-ink-900">Keluhan pasien terakhir</h3>
            <div className="mt-4 space-y-3">
              {db.antrian.filter((a) => a.dokterId === dokter.id && a.selesaiPada).slice(-4).reverse().map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl bg-ink-50/70 p-3.5">
                  <span className="nomor-antrian shrink-0 text-[12.5px] font-bold text-brand-700">{a.kode}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink-800">{a.pasienNama}</p>
                    <p className="truncate text-[11.5px] text-ink-500">{a.catatan ?? a.alasan}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-[11px] text-ink-400">{jam(a.selesaiPada)}</span>
                </div>
              ))}
              {db.antrian.filter((a) => a.dokterId === dokter.id && a.selesaiPada).length === 0 && <p className="text-[12.5px] text-ink-400">Belum ada pasien selesai.</p>}
            </div>
            <div className="mt-5"><Link to="/dokter/riwayat"><Tombol varian="tepi" ukuran="kecil" lebar>Lihat riwayat lengkap</Tombol></Link></div>
          </Kartu>
        </div>
      </div>
    </AppShell>
  )
}

/* --------------------------------------------------------- riwayat dokter */

export function DokterRiwayat() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  const dokter = db.dokter.find((d) => d.email === sesi.email) ?? db.dokter[0]
  const [tab, setTab] = useState('Semua')
  const [kueri, setKueri] = useState('')

  const daftar = db.antrian.filter((a) => a.dokterId === dokter.id).sort((a, b) => new Date(b.ambilPada).getTime() - new Date(a.ambilPada).getTime())
  const tersaring = daftar
    .filter((a) => (tab === 'Semua' ? true : tab === 'Selesai' ? a.status === 'selesai' : tab === 'Berjalan' ? ['menunggu', 'dipanggil', 'dilayani'].includes(a.status) : a.status === 'batal'))
    .filter((a) => a.pasienNama.toLowerCase().includes(kueri.toLowerCase()) || a.kode.toLowerCase().includes(kueri.toLowerCase()))

  return (
    <AppShell judul="Riwayat Pasien" sub={`${dokter.nama} · ${daftar.length} pasien`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72"><Tab tab={['Semua', 'Berjalan', 'Selesai', 'Batal']} aktif={tab} onPilih={setTab} /></div>
        <input value={kueri} onChange={(e) => setKueri(e.target.value)} placeholder="Cari nama atau kode…" className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm sm:w-64" />
      </div>

      <Kartu className="overflow-hidden">
        <div className="hidden grid-cols-[5rem_1fr_9rem_7rem_6rem] gap-4 border-b border-ink-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400 sm:grid">
          <span>Kode</span><span>Pasien</span><span>Keluhan</span><span>Waktu</span><span>Status</span>
        </div>
        {tersaring.map((a) => (
          <div key={a.id} className="grid gap-2 border-b border-ink-50 px-5 py-3.5 last:border-0 sm:grid-cols-[5rem_1fr_9rem_7rem_6rem] sm:items-center sm:gap-4">
            <span className="nomor-antrian text-[13.5px] font-bold text-ink-900">{a.kode}</span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-ink-800">{a.pasienNama}</p>
              <p className="truncate text-[11.5px] text-ink-400">{a.telepon}</p>
            </div>
            <span className="truncate text-[12.5px] text-ink-500">{a.alasan}</span>
            <span className="text-[12.5px] text-ink-500">{tanggalPanjang(a.ambilPada)} · {jam(a.ambilPada)}</span>
            <Lencana className={cn('w-fit ring-1 ring-inset', LABEL_STATUS[a.status].latar)}>{LABEL_STATUS[a.status].label}</Lencana>
          </div>
        ))}
        {tersaring.length === 0 && <Kosong judul="Tidak ada data" pesan="Tidak ditemukan pasien pada filter ini." />}
      </Kartu>
    </AppShell>
  )
}

/* --------------------------------------------------------- jadwal dokter */

export function DokterJadwal() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  const dokter = db.dokter.find((d) => d.email === sesi.email) ?? db.dokter[0]
  const [detail, setDetail] = useState<string | null>(null)

  const jadwal = db.jadwal.filter((j) => j.dokterId === dokter.id)
  const hari = [1, 2, 3, 4, 5, 6]
  const perHari = useMemo(() => hari.map((h) => ({ h, slot: jadwal.filter((j) => j.hari === h) })), [jadwal])

  const slotTerpilih = jadwal.find((j) => j.id === detail)
  const kuotaTerpakai = (id: string) => {
    const j = jadwal.find((x) => x.id === id)
    if (!j) return 0
    const mulai = new Date()
    mulai.setDate(mulai.getDate() - ((new Date().getDay() - j.hari + 7) % 7))
    const iso = mulai.toISOString().slice(0, 10)
    return db.antrian.filter((a) => a.dokterId === dokter.id && a.ambilPada.slice(0, 10) === iso).length
  }

  return (
    <AppShell judul="Jadwal Praktik Saya" sub={dokter.nama}>
      <Kartu className="p-6">
        <div className="overflow-x-auto">
          <div className="grid min-w-[46rem] grid-cols-6 gap-3">
            {perHari.map(({ h, slot }) => (
              <div key={h}>
                <p className={cn('mb-3 text-center text-[12.5px] font-semibold', h === new Date().getDay() ? 'text-brand-700' : 'text-ink-400')}>{namaHari(h)}</p>
                <div className="space-y-2">
                  {slot.map((j) => (
                    <button key={j.id} onClick={() => setDetail(j.id)} className="w-full rounded-xl border border-ink-200 bg-white p-3 text-left transition hover:border-brand-300 hover:bg-brand-50">
                      <p className="text-[12.5px] font-semibold text-ink-800">{j.mulai}–{j.selesai}</p>
                      <p className="mt-0.5 text-[11px] text-ink-400">{db.cabang.find((c) => c.id === j.cabangId)?.kode}</p>
                      <Progres className="mt-2" nilai={kuotaTerpakai(j.id)} maks={j.kuota} />
                      <p className="mt-1 text-[10.5px] text-ink-400">{kuotaTerpakai(j.id)}/{j.kuota} terpakai</p>
                    </button>
                  ))}
                  {slot.length === 0 && <div className="rounded-xl border border-dashed border-ink-200 py-6 text-center text-[11px] text-ink-300">Libur</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Kartu>

      <Modal buka={!!slotTerpilih} onTutup={() => setDetail(null)} judul="Detail Jadwal" lebar="kecil">
        {slotTerpilih && (
          <div className="space-y-4">
            <dl className="space-y-3 text-[13.5px]">
              {[
                { k: 'Hari', v: namaHari(slotTerpilih.hari) },
                { k: 'Jam', v: `${slotTerpilih.mulai} – ${slotTerpilih.selesai}` },
                { k: 'Cabang', v: db.cabang.find((c) => c.id === slotTerpilih.cabangId)?.nama ?? '-' },
                { k: 'Kuota', v: `${slotTerpilih.kuota} pasien` },
                { k: 'Terpakai', v: `${kuotaTerpakai(slotTerpilih.id)} pasien` },
              ].map((x) => (
                <div key={x.k} className="flex items-center justify-between border-b border-ink-50 pb-2.5">
                  <dt className="text-ink-400">{x.k}</dt>
                  <dd className="font-medium text-ink-800">{x.v}</dd>
                </div>
              ))}
            </dl>
            <Tombol varian="tepi" lebar onClick={() => setDetail(null)}>Tutup</Tombol>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

export const IkonPoli = Ikon
export type { Antrian, Prioritas }
export { Pilih }
