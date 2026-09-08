import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Megaphone, QrCode, RotateCcw, Search } from 'lucide-react'
import { Ikon } from '../components/Icon'
import { AppShell, KartuSorotan, tampilkanCabang } from '../components/AppShell'
import { PapanAntrian } from '../components/PapanAntrian'
import { AngkaAnimasi, GrafikArea, GrafikDonat, useTick } from '../components/charts'
import {
  AreaTeks, Kartu, Kosong, Lencana, Masukan, Modal, Pilih, Tab, Tombol, gunakanToast,
} from '../components/ui'
import {
  LABEL_PRIORITAS, LABEL_STATUS, antreanPoli, buatJanjiTemu, hapusNotifikasi, kirimPengumuman,
  pakaiDB, pakaiPenggunaSesi, panggilAntrian, panggilBerikutnya, pindahkanCabang, resetAntrianHarian,
  statusJanjiTemu, ubahPrioritas, ubahStatusAntrian, urutAntrian,
} from '../lib/db'
import { distribusiStatus, kpi, kunjunganHarian, prediksiTunggu, trenTunggu } from '../lib/analytics'
import { cn, hariIniISO, jam, keCSV, selisihMenit, tanggalPanjang, unduhBerkas } from '../lib/utils'
import type { Antrian, Prioritas, StatusAntrian } from '../lib/types'

/* ------------------------------------------------------------ monitoring */

export function PetugasBeranda() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  useTick(15000)
  const cabangId = sesi.cabangId ?? tampilkanCabang()
  const statistik = kpi(db, cabangId)
  const deret = kunjunganHarian(db, 7, cabangId)
  const tren = trenTunggu(db, 7, cabangId)
  const status = distribusiStatus(db, cabangId)
  const poliAktif = db.poli.filter((p) => p.aktif && p.cabangIds.includes(cabangId))
  const [bukaPengumuman, setBukaPengumuman] = useState(false)
  const { tampilkan } = gunakanToast()

  return (
    <AppShell judul="Monitoring Antrian" sub={`${db.cabang.find((c) => c.id === cabangId)?.nama} · ${tanggalPanjang(new Date())}`}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KartuSorotan judul="Kunjungan hari ini" nilai={<AngkaAnimasi nilai={statistik.hariIni} />} sub={`${statistik.dibandingKemarin >= 0 ? '+' : ''}${statistik.dibandingKemarin}% vs kemarin`} ikon="daftar" warna="#0c8672" />
          <KartuSorotan judul="Sedang menunggu" nilai={<AngkaAnimasi nilai={statistik.menunggu} />} sub={`${statistik.dilayani} dalam pelayanan`} ikon="jam" warna="#3b82f6" />
          <KartuSorotan judul="Rata-rata tunggu" nilai={<><AngkaAnimasi nilai={statistik.rataTunggu} /><span className="text-sm font-medium text-ink-400"> mnt</span></>} sub={`layanan ${statistik.rataLayan} mnt`} ikon="grafik" warna="#d97706" />
          <KartuSorotan judul="Tingkat penyelesaian" nilai={<><AngkaAnimasi nilai={statistik.tingkatSelesai} /><span className="text-sm font-medium text-ink-400">%</span></>} sub={`${statistik.batal} batal`} ikon="centang" warna="#8b5cf6" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <Kartu className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
              <div>
                <h3 className="text-[15px] font-semibold text-ink-900">Antrean per poli</h3>
                <p className="text-[12px] text-ink-400">Klik panggil untuk memanggil nomor terdepan</p>
              </div>
              <Link to="/petugas/antrian" className="text-[12.5px] font-semibold text-brand-700 hover:text-brand-800">Kelola penuh →</Link>
            </div>
            <div className="max-h-[30rem] overflow-y-auto">
              {poliAktif.map((p) => {
                const antre = antreanPoli(db, p.id, cabangId).filter((a) => a.status === 'menunggu')
                const terdepan = antre[0]
                const dokter = db.dokter.find((d) => d.id === terdepan?.dokterId)
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-ink-50 px-5 py-3.5 last:border-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${p.warna}18` }}>
                      <Ikon nama={p.ikon} ukuran={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink-900">{p.nama}</p>
                      <p className="truncate text-[11.5px] text-ink-400">{p.ruang} · {dokter?.nama.split(',')[0] ?? 'dokter jaga'}</p>
                    </div>
                    {terdepan ? (
                      <span className="nomor-antrian rounded-lg bg-ink-950 px-2.5 py-1 text-[13px] font-bold text-white">{terdepan.kode}</span>
                    ) : (
                      <span className="text-[12px] text-ink-300">antrean kosong</span>
                    )}
                    <span className="w-16 text-right text-[12px] font-medium text-ink-500">{antre.length} antre</span>
                    <Tombol
                      varian="lembut" ukuran="kecil"
                      disabled={!terdepan}
                      onClick={() => { if (terdepan) { panggilAntrian(terdepan.id); tampilkan('Memanggil ' + terdepan.kode, `${terdepan.pasienNama} → ${p.ruang}`) } }}
                    >
                      Panggil
                    </Tombol>
                  </div>
                )
              })}
            </div>
          </Kartu>

          <div className="space-y-4">
            <Kartu className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-ink-900">Kunjungan 7 hari</h3>
                <span className="text-[11.5px] text-ink-400">total {deret.reduce((s, d) => s + d.total, 0)}</span>
              </div>
              <GrafikArea data={deret.map((d) => ({ label: d.label, nilai: d.total }))} tinggi={160} />
            </Kartu>

            <Kartu className="p-5">
              <h3 className="mb-4 text-[15px] font-semibold text-ink-900">Distribusi status</h3>
              <GrafikDonat data={status} ukuran={140} tebal={15} pusatBawah="total" />
            </Kartu>

            <Kartu className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-ink-900">Tren waktu tunggu</h3>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">menit</span>
              </div>
              <div className="space-y-2.5">
                {tren.map((t) => {
                  const maks = Math.max(...tren.map((x) => x.total), 1)
                  return (
                    <div key={t.tanggal} className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-[11.5px] text-ink-400">{t.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(t.total / maks) * 100}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-700">{t.total}</span>
                    </div>
                  )
                })}
              </div>
            </Kartu>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
          <div>
            <p className="text-[14px] font-semibold text-brand-900">Panggilan terakhir</p>
            <p className="text-[12.5px] text-brand-700">Tampilkan di layar besar ruang tunggu</p>
          </div>
          <div className="flex gap-2.5">
            <Tombol varian="utama" ukuran="kecil" ikon="pengumuman" onClick={() => setBukaPengumuman(true)}>Kirim Pengumuman</Tombol>
            <Link to="/tv"><Tombol varian="tepi" ukuran="kecil" ikon="tv">Buka Display TV</Tombol></Link>
          </div>
        </div>

        <Kartu className="overflow-hidden p-4">
          <PapanAntrian cabangId={cabangId} ringkas />
        </Kartu>
      </div>

      <ModalPengumuman buka={bukaPengumuman} onTutup={() => setBukaPengumuman(false)} />
    </AppShell>
  )
}

function ModalPengumuman({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const [judul, setJudul] = useState('')
  const [pesan, setPesan] = useState('')
  const { tampilkan } = gunakanToast()
  const kirim = () => {
    if (judul.trim().length < 3) return
    kirimPengumuman(judul, pesan || 'Pengumuman dari petugas loket.')
    tampilkan('Pengumuman terkirim', 'Notifikasi dikirim ke seluruh perangkat pasien.')
    setJudul(''); setPesan(''); onTutup()
  }
  return (
    <Modal buka={buka} onTutup={onTutup} judul="Kirim Pengumuman" sub="Muncul sebagai notifikasi pada perangkat pasien">
      <div className="space-y-4">
        <Masukan label="Judul" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="cth. Poli Gigi menunda 15 menit" />
        <AreaTeks label="Isi pesan" rows={3} value={pesan} onChange={(e) => setPesan(e.target.value)} placeholder="Tuliskan pesan singkat dan jelas…" />
        <div className="flex justify-end gap-2">
          <Tombol varian="tepi" onClick={onTutup}>Batal</Tombol>
          <Tombol onClick={kirim} ikon="pengumuman">Kirim Sekarang</Tombol>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------ manajemen antrian */

const STATUS_PILIHAN: StatusAntrian[] = ['menunggu', 'dipanggil', 'dilayani', 'selesai', 'batal']
const PRIORITAS_PILIHAN: Prioritas[] = ['darurat', 'hamil', 'difabel', 'lansia', 'reguler']

export function PetugasAntrian() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  useTick(10000)
  const { tampilkan } = gunakanToast()
  const cabangId = sesi.cabangId ?? tampilkanCabang()

  const [fPoli, setFPoli] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fPrioritas, setFPrioritas] = useState('')
  const [kueri, setKueri] = useState('')
  const [detail, setDetail] = useState<Antrian | null>(null)

  const daftar = useMemo(() => {
    return db.antrian
      .filter((a) => a.cabangId === cabangId)
      .filter((a) => !fPoli || a.poliId === fPoli)
      .filter((a) => !fStatus || a.status === fStatus)
      .filter((a) => !fPrioritas || a.prioritas === fPrioritas)
      .filter((a) => !kueri || a.kode.toLowerCase().includes(kueri.toLowerCase()) || a.pasienNama.toLowerCase().includes(kueri.toLowerCase()))
      .sort((a, b) => new Date(b.ambilPada).getTime() - new Date(a.ambilPada).getTime())
      .slice(0, 120)
  }, [db.antrian, cabangId, fPoli, fStatus, fPrioritas, kueri])

  const ekspor = () => {
    const csv = keCSV(
      ['Kode', 'Nama', 'Poli', 'Dokter', 'Prioritas', 'Status', 'Ambil', 'Panggil', 'Selesai', 'Tunggu (mnt)'],
      daftar.map((a) => [
        a.kode, a.pasienNama, db.poli.find((p) => p.id === a.poliId)?.nama ?? '',
        db.dokter.find((d) => d.id === a.dokterId)?.nama ?? '', a.prioritas, a.status,
        jam(a.ambilPada), a.dipanggilPada ? jam(a.dipanggilPada) : '-',
        a.selesaiPada ? jam(a.selesaiPada) : '-',
        a.dipanggilPada ? selisihMenit(a.ambilPada, a.dipanggilPada) : '-',
      ]),
    )
    unduhBerkas(`antrian-${hariIniISO()}.csv`, csv, 'text/csv')
    tampilkan('Laporan diekspor', `${daftar.length} baris tersimpan sebagai CSV.`)
  }

  return (
    <AppShell
      judul="Manajemen Antrian" sub={`${daftar.length} data ditampilkan`}
      aksi={
        <>
          <input value={kueri} onChange={(e) => setKueri(e.target.value)} placeholder="Cari kode / nama…" className="h-9 flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-[13px] sm:max-w-xs" />
          <Pilih kecil opsi={db.poli.map((p) => ({ nilai: p.id, label: p.nama, warna: p.warna }))} nilai={fPoli} onPilih={setFPoli} placeholder="Semua poli" />
          <Pilih kecil opsi={STATUS_PILIHAN.map((s) => ({ nilai: s, label: LABEL_STATUS[s].label }))} nilai={fStatus} onPilih={setFStatus} placeholder="Semua status" />
          <Pilih kecil opsi={PRIORITAS_PILIHAN.map((s) => ({ nilai: s, label: LABEL_PRIORITAS[s].label }))} nilai={fPrioritas} onPilih={setFPrioritas} placeholder="Semua prioritas" />
          <Tombol varian="tepi" ukuran="kecil" onClick={ekspor} ikonKanan={<Download size={13} />}>Ekspor</Tombol>
          <Tombol varian="tepi" ukuran="kecil" onClick={() => { resetAntrianHarian(cabangId); tampilkan('Antrian direset', 'Data antrian hari ini pada cabang ini dikosongkan.', 'peringatan') }} ikonKanan={<RotateCcw size={13} />}>Reset Harian</Tombol>
        </>
      }
    >
      <Kartu className="overflow-hidden">
        <div className="hidden grid-cols-[5.5rem_1fr_9rem_7rem_6.5rem_10rem] gap-4 border-b border-ink-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400 lg:grid">
          <span>Kode</span><span>Pasien</span><span>Poli / Dokter</span><span>Prioritas</span><span>Tunggu</span><span>Aksi</span>
        </div>
        <AnimatePresence initial={false}>
          {daftar.map((a, i) => {
            const p = db.poli.find((x) => x.id === a.poliId)
            const d = db.dokter.find((x) => x.id === a.dokterId)
            const tunggu = a.dipanggilPada ? selisihMenit(a.ambilPada, a.dipanggilPada) : selisihMenit(a.ambilPada)
            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i * 0.012, 0.3) }}
                className={cn('grid gap-2 border-b border-ink-50 px-5 py-3.5 last:border-0 lg:grid-cols-[5.5rem_1fr_9rem_7rem_6.5rem_10rem] lg:items-center lg:gap-4', a.status === 'dipanggil' && 'bg-blue-50/50')}
              >
                <button onClick={() => setDetail(a)} className="nomor-antrian w-fit text-left text-[14px] font-bold text-ink-900 hover:text-brand-700">{a.kode}</button>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink-800">{a.pasienNama}</p>
                  <p className="truncate text-[11.5px] text-ink-400">{a.alasan} · {jam(a.ambilPada)}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-ink-700">{p?.nama}</p>
                  <p className="truncate text-[11px] text-ink-400">{d?.nama.split(',')[0] ?? '-'}</p>
                </div>
                <Lencana className={cn('w-fit ring-1 ring-inset', LABEL_PRIORITAS[a.prioritas].latar)} titik={LABEL_PRIORITAS[a.prioritas].titik}>{LABEL_PRIORITAS[a.prioritas].label}</Lencana>
                <div>
                  <p className="text-[12.5px] font-semibold tabular-nums text-ink-700">{tunggu} mnt</p>
                  <Lencana className={cn('ring-1 ring-inset', LABEL_STATUS[a.status].latar)}>{LABEL_STATUS[a.status].label}</Lencana>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(a.status === 'menunggu' || a.status === 'dipanggil') && (
                    <Tombol varian="lembut" ukuran="kecil" onClick={() => { panggilAntrian(a.id); tampilkan('Memanggil ' + a.kode) }}>Panggil</Tombol>
                  )}
                  {a.status !== 'selesai' && a.status !== 'batal' && (
                    <Tombol varian="tepi" ukuran="kecil" onClick={() => { ubahStatusAntrian(a.id, 'selesai'); tampilkan(a.kode + ' selesai') }}>Selesai</Tombol>
                  )}
                  {a.status === 'menunggu' && (
                    <Pilih
                      kecil opsi={[{ nilai: '', label: 'Ubah…' }, ...PRIORITAS_PILIHAN.map((s) => ({ nilai: s, label: LABEL_PRIORITAS[s].label }))]}
                      nilai=""
                      onPilih={(v) => { if (v) { ubahPrioritas(a.id, v as Prioritas); tampilkan('Prioritas diperbarui', `${a.kode} → ${v}`, 'peringatan') } }}
                    />
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {daftar.length === 0 && <Kosong ikon="daftar" judul="Tidak ada antrian" pesan="Ubah filter atau ambil nomor baru di loket." />}
      </Kartu>

      <Modal buka={!!detail} onTutup={() => setDetail(null)} judul={detail ? `Detail ${detail.kode}` : ''} sub={detail ? detail.pasienNama : ''}>
        {detail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                { k: 'Poli', v: db.poli.find((p) => p.id === detail.poliId)?.nama ?? '-' },
                { k: 'Dokter', v: db.dokter.find((d) => d.id === detail.dokterId)?.nama.split(',')[0] ?? '-' },
                { k: 'Telepon', v: detail.telepon },
                { k: 'Cabang', v: db.cabang.find((c) => c.id === detail.cabangId)?.nama ?? '-' },
                { k: 'Waktu ambil', v: jam(detail.ambilPada) },
                { k: 'Estimasi awal', v: `${detail.estimasiAwal} menit` },
                { k: 'Keluhan', v: detail.alasan },
                { k: 'Catatan', v: detail.catatan ?? '-' },
              ].map((x) => (
                <div key={x.k} className="rounded-xl bg-ink-50 p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-ink-400">{x.k}</dt>
                  <dd className="mt-1 font-medium text-ink-800">{x.v}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-3">
              <Pilih label="Ubah prioritas" opsi={PRIORITAS_PILIHAN.map((s) => ({ nilai: s, label: LABEL_PRIORITAS[s].label }))} nilai={detail.prioritas} onPilih={(v) => { ubahPrioritas(detail.id, v as Prioritas); setDetail({ ...detail, prioritas: v as Prioritas }) }} />
              <Pilih label="Pindah cabang" opsi={db.cabang.map((c) => ({ nilai: c.id, label: c.nama, sub: c.kota, warna: c.warna }))} nilai={detail.cabangId} onPilih={(v) => { pindahkanCabang(detail.id, v); tampilkan('Pasien dipindahkan', 'Nomor dihitung ulang pada cabang tujuan.') }} />
            </div>
            <div className="flex justify-end gap-2">
              <Tombol varian="bahaya" ukuran="kecil" onClick={() => { ubahStatusAntrian(detail.id, 'batal', 'Dibatalkan petugas'); setDetail(null); tampilkan('Antrian dibatalkan', undefined, 'peringatan') }}>Batalkan</Tombol>
              <Tombol onClick={() => { panggilAntrian(detail.id); setDetail(null) }} ikon="pengumuman">Panggil</Tombol>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

/* ------------------------------------------------------------ pindai QR */

export function PetugasQR() {
  const db = pakaiDB()
  useTick(8000)
  const { tampilkan } = gunakanToast()
  const [kode, setKode] = useState('')
  const [hasil, setHasil] = useState<Antrian | null>(null)
  const [galat, setGalat] = useState('')

  const cari = (e: React.FormEvent) => {
    e.preventDefault()
    const a = db.antrian.find((x) => x.kode.toUpperCase() === kode.trim().toUpperCase())
    if (!a) {
      setGalat(`Nomor "${kode}" tidak ditemukan pada hari ini.`)
      setHasil(null)
      return
    }
    setGalat('')
    setHasil(a)
  }

  const panggilan = db.antrian.filter((a) => a.dipanggilPada).sort((a, b) => new Date(b.dipanggilPada!).getTime() - new Date(a.dipanggilPada!).getTime()).slice(0, 8)

  return (
    <AppShell judul="Pindai QR Tiket" sub="Verifikasi pasien dan panggil nomor dari satu layar">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Kartu className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50"><QrCode size={22} className="text-brand-700" /></span>
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">Pemindai tiket</h3>
              <p className="text-[12.5px] text-ink-400">Arahkan kamera atau ketik kode manual</p>
            </div>
          </div>

          <form onSubmit={cari} className="mt-6 space-y-4">
            <input
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="UMU-07"
              autoFocus
              className="h-16 w-full rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/50 text-center text-2xl font-bold uppercase tracking-[0.2em] text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:bg-white focus:outline-none"
            />
            {galat && <p className="text-[12.5px] font-medium text-rose-600">{galat}</p>}
            <Tombol type="submit" lebar ukuran="besar" ikon="cari">Verifikasi Tiket</Tombol>
          </form>

          <div className="mt-6 rounded-2xl bg-ink-50 p-4">
            <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-400">Nomor dipanggil terakhir</p>
            <div className="flex flex-wrap gap-2">
              {panggilan.map((a) => (
                <button key={a.id} onClick={() => { setKode(a.kode); setHasil(a) }} className="rounded-lg bg-white px-2.5 py-1.5 text-[12px] font-semibold tabular-nums text-ink-700 ring-1 ring-ink-200 transition hover:ring-brand-300">
                  {a.kode}
                </button>
              ))}
            </div>
          </div>
        </Kartu>

        <Kartu className="relative overflow-hidden p-6">
          <AnimatePresence mode="wait">
            {hasil ? (
              <motion.div key={hasil.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Tiket terverifikasi</p>
                    <p className="nomor-antrian mt-1 text-5xl font-bold text-ink-950">{hasil.kode}</p>
                    <p className="mt-1.5 text-[14px] font-medium text-ink-700">{hasil.pasienNama}</p>
                  </div>
                  <Lencana className={cn('ring-1 ring-inset', LABEL_STATUS[hasil.status].latar)}>{LABEL_STATUS[hasil.status].label}</Lencana>
                </div>

                <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-brand-900">Perkiraan tunggu</span>
                    <span className="font-semibold text-brand-700">{prediksiTunggu(db, hasil).estimasi} menit</span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-brand-800/70">Posisi ke-{prediksiTunggu(db, hasil).posisi} · {prediksiTunggu(db, hasil).antrianDepan} di depan</p>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                  {[
                    { k: 'Poli', v: db.poli.find((p) => p.id === hasil.poliId)?.nama ?? '-' },
                    { k: 'Ruang', v: db.poli.find((p) => p.id === hasil.poliId)?.ruang ?? '-' },
                    { k: 'Dokter', v: db.dokter.find((d) => d.id === hasil.dokterId)?.nama.split(',')[0] ?? '-' },
                    { k: 'Prioritas', v: LABEL_PRIORITAS[hasil.prioritas].label },
                  ].map((x) => (
                    <div key={x.k} className="rounded-xl bg-ink-50 p-3">
                      <dt className="text-[11px] uppercase tracking-wide text-ink-400">{x.k}</dt>
                      <dd className="mt-1 font-medium text-ink-800">{x.v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Tombol onClick={() => { panggilAntrian(hasil.id); tampilkan('Memanggil ' + hasil.kode, `${hasil.pasienNama} → ${db.poli.find((p) => p.id === hasil.poliId)?.ruang}`) }} ikon="pengumuman">Panggil Nomor Ini</Tombol>
                  <Tombol varian="lembut" onClick={() => { ubahStatusAntrian(hasil.id, 'selesai'); tampilkan(hasil.kode + ' selesai') }} ikon="centang">Selesai</Tombol>
                  <Tombol varian="tepi" onClick={() => { ubahStatusAntrian(hasil.id, 'batal', 'Dilewati petugas'); tampilkan('Dibatalkan', undefined, 'peringatan') }}>Batalkan</Tombol>
                </div>
              </motion.div>
            ) : (
              <motion.div key="kosong" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Kosong ikon="qr" judul="Menunggu pemindaian" pesan="Pindai QR pada tiket pasien atau ketik kode antrian untuk menampilkan detail dan memanggil nomor." />
              </motion.div>
            )}
          </AnimatePresence>
        </Kartu>
      </div>
    </AppShell>
  )
}

/* ---------------------------------------------------------- janji temu */

export function PetugasJanjiTemu() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  const { tampilkan } = gunakanToast()
  const [tab, setTab] = useState('Semua')
  const [buka, setBuka] = useState(false)
  const [form, setForm] = useState({ pasienNama: '', dokterId: '', tanggal: hariIniISO(), jam: '09:00', alasan: '', cabangId: sesi.cabangId ?? db.cabang[0].id })

  const daftar = db.janjiTemu
    .filter((j) => j.cabangId === (sesi.cabangId ?? cabangAktifGlobal()))
    .filter((j) => (tab === 'Semua' ? true : tab === 'Menunggu' ? j.status === 'menunggu' : tab === 'Dikonfirmasi' ? j.status === 'dikonfirmasi' : j.status === 'batal' || j.status === 'selesai'))
    .sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam))

  const simpan = () => {
    if (form.pasienNama.trim().length < 3 || !form.dokterId) return
    buatJanjiTemu({ ...form, pasienId: '' })
    tampilkan('Janji temu dibuat', `${form.pasienNama} dijadwalkan ${form.tanggal} ${form.jam}`)
    setBuka(false)
    setForm({ ...form, pasienNama: '', alasan: '' })
  }

  return (
    <AppShell judul="Janji Temu" sub={`${db.janjiTemu.length} jadwal tercatat`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-80"><Tab tab={['Semua', 'Menunggu', 'Dikonfirmasi', 'Riwayat']} aktif={tab} onPilih={setTab} /></div>
        <Tombol ukuran="kecil" ikon="tambah" onClick={() => setBuka(true)}>Tambah Janji Temu</Tombol>
      </div>

      <Kartu className="overflow-hidden">
        <div className="hidden grid-cols-[6rem_1fr_1fr_8rem_7rem_10rem] gap-4 border-b border-ink-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400 lg:grid">
          <span>Kode</span><span>Pasien</span><span>Dokter / Poli</span><span>Jadwal</span><span>Status</span><span>Aksi</span>
        </div>
        {daftar.map((j) => (
          <div key={j.id} className="grid gap-2 border-b border-ink-50 px-5 py-3.5 last:border-0 lg:grid-cols-[6rem_1fr_1fr_8rem_7rem_10rem] lg:items-center lg:gap-4">
            <span className="text-[13px] font-bold text-ink-900">{j.kode}</span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-ink-800">{j.pasienNama}</p>
              <p className="truncate text-[11.5px] text-ink-400">{j.alasan}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium text-ink-700">{db.dokter.find((d) => d.id === j.dokterId)?.nama.split(',')[0]}</p>
              <p className="truncate text-[11px] text-ink-400">{db.poli.find((p) => p.id === j.poliId)?.nama}</p>
            </div>
            <div className="text-[12.5px] text-ink-600">
              <p className="font-medium">{tanggalPanjang(j.tanggal)}</p>
              <p className="text-ink-400">{j.jam}</p>
            </div>
            <Lencana className={cn('w-fit ring-1 ring-inset', j.status === 'dikonfirmasi' ? 'bg-brand-100 text-brand-700 ring-brand-200' : j.status === 'menunggu' ? 'bg-amber-100 text-amber-700 ring-amber-200' : j.status === 'batal' ? 'bg-rose-100 text-rose-700 ring-rose-200' : 'bg-ink-100 text-ink-600 ring-ink-200')}>{j.status}</Lencana>
            <div className="flex flex-wrap gap-1.5">
              {j.status === 'menunggu' && <Tombol varian="lembut" ukuran="kecil" onClick={() => { statusJanjiTemu(j.id, 'dikonfirmasi'); tampilkan('Dikonfirmasi', `${j.kode} dikonfirmasi`) }}>Konfirmasi</Tombol>}
              {(j.status === 'menunggu' || j.status === 'dikonfirmasi') && (
                <>
                  <Tombol varian="tepi" ukuran="kecil" onClick={() => { statusJanjiTemu(j.id, 'selesai'); tampilkan('Ditandai selesai') }}>Selesai</Tombol>
                  <Tombol varian="bahaya" ukuran="kecil" onClick={() => { statusJanjiTemu(j.id, 'batal'); tampilkan('Dibatalkan', undefined, 'peringatan') }}>Batal</Tombol>
                </>
              )}
            </div>
          </div>
        ))}
        {daftar.length === 0 && <Kosong ikon="kalender" judul="Tidak ada janji temu" pesan="Belum ada jadwal pada kategori ini." />}
      </Kartu>

      <Modal buka={buka} onTutup={() => setBuka(false)} judul="Tambah Janji Temu" sub="Dibuat atas nama pasien yang datang ke loket">
        <div className="space-y-4">
          <Masukan label="Nama pasien" value={form.pasienNama} onChange={(e) => setForm({ ...form, pasienNama: e.target.value })} placeholder="Nama lengkap" ikon="pengguna" />
          <Pilih label="Dokter" opsi={db.dokter.filter((d) => d.aktif).map((d) => ({ nilai: d.id, label: d.nama, sub: d.spesialis }))} nilai={form.dokterId} onPilih={(v) => setForm({ ...form, dokterId: v })} carian />
          <div className="grid gap-4 sm:grid-cols-2">
            <Masukan label="Tanggal" type="date" min={hariIniISO()} value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            <Masukan label="Jam" type="time" value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} />
          </div>
          <AreaTeks label="Alasan" rows={2} value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Tombol varian="tepi" onClick={() => setBuka(false)}>Batal</Tombol>
            <Tombol onClick={simpan} ikon="centang">Simpan</Tombol>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}

function cabangAktifGlobal() {
  return tampilkanCabang()
}

export { Megaphone, Search }
