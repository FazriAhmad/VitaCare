import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, Check, Clock, Plus, ShieldCheck, X } from 'lucide-react'
import { Ikon } from '../components/Icon'
import { KartuTiket } from '../components/KartuTiket'
import { AppShell, KartuSorotan } from '../components/AppShell'
import { AngkaAnimasi, Progres, useTick } from '../components/charts'
import { AreaTeks, Kartu, Kosong, Lencana, Masukan, Modal, Pilih, Tab, Tombol, gunakanToast } from '../components/ui'
import { ModalKonfirmasi } from './AdminMaster'
import { LABEL_PRIORITAS, buatJanjiTemu, cariDokter, eksporDataSaya, hapusAkunSaya, pakaiDB, pakaiPenggunaSesi, statusJanjiTemu, ubahStatusAntrian } from '../lib/db'
import { kpi, prediksiTunggu, trenTunggu } from '../lib/analytics'
import { cn, hariIniISO, jam, namaHari, relatifWaktu, selisihMenit, tanggalPanjang } from '../lib/utils'
import type { Antrian } from '../lib/types'

/* ------------------------------------------------------------- beranda */

export function PasienBeranda() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  useTick(20000)

  const antrianSaya = db.antrian
    .filter((a) => a.pasienId === sesi.id || (a.telepon === sesi.telepon && a.ambilPada.slice(0, 10) === hariIniISO()))
    .sort((a, b) => new Date(b.ambilPada).getTime() - new Date(a.ambilPada).getTime())

  const aktif = antrianSaya.find((a) => a.status === 'menunggu' || a.status === 'dipanggil' || a.status === 'dilayani')
  const selesai = antrianSaya.filter((a) => a.status === 'selesai')
  const janji = db.janjiTemu
    .filter((j) => j.pasienId === sesi.id && j.status !== 'batal' && j.status !== 'selesai')
    .sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam))[0]

  const prediksi = aktif ? prediksiTunggu(db, aktif) : null
  const poli = aktif ? db.poli.find((p) => p.id === aktif.poliId) : null
  const statistik = kpi(db)
  const tren = trenTunggu(db, 7)
  const rataSaya = selesai.length
    ? Math.round(selesai.reduce((s, a) => s + (a.dipanggilPada ? selisihMenit(a.ambilPada, a.dipanggilPada) : 0), 0) / selesai.length)
    : 0

  return (
    <AppShell judul={`Halo, ${sesi.nama.split(' ')[0]}`} sub={aktif ? `Nomor ${aktif.kode} sedang menunggu` : 'Belum ada antrian aktif hari ini'}>
      <div className="space-y-6">
        {/* sorotan utama */}
        {aktif && prediksi ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <KartuTiket antrian={aktif} />
            <div className="space-y-4">
              <Kartu className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-ink-900">Posisi & perkiraan</h3>
                  <Lencana className={cn('ring-1 ring-inset', aktif.status === 'dipanggil' ? 'animate-blink bg-blue-100 text-blue-700 ring-blue-200' : 'bg-brand-50 text-brand-700 ring-brand-200')}>
                    {aktif.status === 'dipanggil' ? 'SILAKAN MENUJU RUANG' : 'menunggu'}
                  </Lencana>
                </div>
                <div className="mt-5 flex items-end gap-3">
                  <span className="text-5xl font-bold tracking-tight text-brand-700"><AngkaAnimasi nilai={prediksi.estimasi} /></span>
                  <span className="pb-2 text-sm text-ink-500">menit lagi</span>
                </div>
                <div className="mt-4"><Progres nilai={prediksi.antrianDepan + 1 - prediksi.posisi} maks={Math.max(1, prediksi.antrianDepan + 1)} /></div>
                <p className="mt-2.5 text-[12.5px] text-ink-400">
                  Ke-{prediksi.posisi} dari {prediksi.antrianDepan + 1} · rentang {prediksi.rentangMin}–{prediksi.rentangMax} menit
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to={`/status?kode=${aktif.kode}`}><Tombol varian="lembut" ukuran="kecil" ikonKanan={<ArrowRight size={13} />}>Pantau penuh</Tombol></Link>
                  <Tombol varian="tepi" ukuran="kecil" onClick={() => ubahStatusAntrian(aktif.id, 'batal', 'Dibatalkan pasien')} ikon="batal">Batalkan</Tombol>
                </div>
              </Kartu>

              {aktif.status === 'dipanggil' && (
                <motion.div
                  animate={{ boxShadow: ['0 0 0 0 rgba(59,130,246,0.35)', '0 0 0 18px rgba(59,130,246,0)'] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="rounded-2xl border border-blue-200 bg-blue-50 p-5"
                >
                  <p className="text-[13.5px] font-semibold text-blue-900">Nomor Anda sedang dipanggil!</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-blue-700">
                    Segera menuju {poli?.ruang}. Tunggu lebih dari 15 menit dapat menyebabkan nomor dilewati.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          <Kartu className="relative overflow-hidden p-8">
            <div className="bintik absolute inset-0 opacity-40" />
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-ink-900">Anda belum mengambil nomor hari ini</h2>
                <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-500">
                  Pilih poli, dapatkan perkiraan waktu tunggu, dan pantau nomor Anda langsung dari ponsel tanpa perlu menunggu di loket.
                </p>
              </div>
              <Link to="/ambil"><Tombol ukuran="besar" ikon="tiket" ikonKanan={<ArrowRight size={16} />}>Ambil Nomor</Tombol></Link>
            </div>
          </Kartu>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KartuSorotan judul="Total kunjungan" nilai={<AngkaAnimasi nilai={antrianSaya.length} />} sub="sejak terdaftar" ikon="riwayat" warna="#0c8672" />
          <KartuSorotan judul="Rata-rata tunggu" nilai={<><AngkaAnimasi nilai={rataSaya} /> <span className="text-sm font-medium text-ink-400">mnt</span></>} sub="dari kunjungan selesai" ikon="jam" warna="#3b82f6" />
          <KartuSorotan judul="Janji temu aktif" nilai={<AngkaAnimasi nilai={db.janjiTemu.filter((j) => j.pasienId === sesi.id && j.status !== 'batal' && j.status !== 'selesai').length} />} sub={janji ? `${tanggalPanjang(janjitemuTanggal(janji.tanggal))} ${janji.jam}` : 'belum ada jadwal'} ikon="kalender" warna="#d97706" />
          <KartuSorotan judul="Antrean hari ini" nilai={<AngkaAnimasi nilai={statistik.hariIni} />} sub={`${statistik.menunggu} masih menunggu`} ikon="daftar" warna="#8b5cf6" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Kartu className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-ink-900">Tren waktu tunggu rumah sakit</h3>
                <p className="mt-0.5 text-[12px] text-ink-400">Rata-rata menit dari ambil nomor hingga dipanggil (7 hari)</p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-[11.5px] font-semibold text-brand-700">7 hari</span>
            </div>
            <div className="space-y-3">
              {tren.map((t) => {
                const maks = Math.max(...tren.map((x) => x.total), 1)
                return (
                  <div key={t.tanggal} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-[11.5px] font-medium text-ink-400">{t.label}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(t.total / maks) * 100}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full grad-teal" />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-700">{t.total}</span>
                  </div>
                )
              })}
            </div>
          </Kartu>

          <Kartu className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-ink-900">Janji temu berikutnya</h3>
              <Link to="/app/janji-temu" className="text-[12.5px] font-semibold text-brand-700 hover:text-brand-800">Kelola</Link>
            </div>
            {janji ? (
              <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-ink-100"><Ikon nama="kalender" ukuran={19} /></span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink-900">{cariDokter(db, janji.dokterId)?.nama.split(',')[0]}</p>
                    <p className="text-[12px] text-ink-500">{db.poli.find((p) => p.id === janji.poliId)?.nama}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-[12.5px] text-ink-600">
                  <span className="flex items-center gap-1.5"><Calendar size={13} /> {tanggalPanjang(janji.tanggal)}</span>
                  <span className="flex items-center gap-1.5"><Clock size={13} /> {janji.jam}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Lencana className={cn('ring-1 ring-inset', janji.status === 'dikonfirmasi' ? 'bg-brand-100 text-brand-700 ring-brand-200' : 'bg-amber-100 text-amber-700 ring-amber-200')}>{janji.status}</Lencana>
                  <span className="text-[11.5px] text-ink-400">{janji.kode}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink-200 p-6 text-center">
                <p className="text-[13px] text-ink-500">Belum ada janji temu.</p>
                <Link to="/app/janji-temu" className="mt-3 inline-block"><Tombol varian="lembut" ukuran="kecil" ikon="tambah">Buat Janji Temu</Tombol></Link>
              </div>
            )}

            <div className="mt-5 border-t border-ink-100 pt-5">
              <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-400">Kunjungan terakhir</p>
              {antrianSaya.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-ink-50 py-2.5 last:border-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink-800">{a.kode}</p>
                    <p className="truncate text-[11.5px] text-ink-400">{db.poli.find((p) => p.id === a.poliId)?.nama} · {tanggalPanjang(a.ambilPada)}</p>
                  </div>
                  <Lencana className={cn('ring-1 ring-inset', a.status === 'selesai' ? 'bg-brand-100 text-brand-700 ring-brand-200' : a.status === 'batal' ? 'bg-rose-100 text-rose-700 ring-rose-200' : 'bg-ink-100 text-ink-600 ring-ink-200')}>{a.status}</Lencana>
                </div>
              ))}
              {antrianSaya.length === 0 && <p className="text-[12.5px] text-ink-400">Belum ada riwayat.</p>}
            </div>
          </Kartu>
        </div>
      </div>
    </AppShell>
  )
}

function janjitemuTanggal(iso: string) {
  return iso
}

/* ---------------------------------------------------------- janji temu */

const JAM_SLOT = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00']

export function PasienJanjiTemu() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  const { tampilkan } = gunakanToast()
  const [tab, setTab] = useState('Janji Temu Saya')
  const [buka, setBuka] = useState(false)
  const [form, setForm] = useState({ dokterId: '', tanggal: hariIniISO(), jam: '', alasan: '', cabangId: sesi.cabangId ?? db.cabang[0].id })
  const [galat, setGalat] = useState<Record<string, string>>({})

  const daftar = db.janjiTemu.filter((j) => j.pasienId === sesi.id)
  const dokterTersedia = db.dokter.filter((d) => d.aktif && db.poli.some((p) => p.id === d.poliId && p.cabangIds.includes(form.cabangId)))
  const jadwalDipilih = db.jadwal.filter((j) => j.dokterId === form.dokterId && j.hari === new Date(form.tanggal).getDay() && j.cabangId === form.cabangId)
  const slotTerpakai = db.janjiTemu.filter((j) => j.dokterId === form.dokterId && j.tanggal === form.tanggal && j.status !== 'batal').map((j) => j.jam)
  const slot = JAM_SLOT.filter((s) => !slotTerpakai.includes(s))

  const simpan = () => {
    const g: Record<string, string> = {}
    if (!form.dokterId) g.dokter = 'Pilih dokter.'
    if (!form.jam) g.jam = 'Pilih jam praktik.'
    if (form.tanggal < hariIniISO()) g.tanggal = 'Tanggal tidak boleh di masa lalu.'
    if (form.alasan.trim().length < 4) g.alasan = 'Tuliskan alasan singkat.'
    setGalat(g)
    if (Object.keys(g).length) return
    buatJanjiTemu({ ...form, pasienId: sesi.id })
    tampilkan('Janji temu dibuat', 'Petugas loket akan mengonfirmasi jadwal Anda.')
    setBuka(false)
    setForm({ ...form, jam: '', alasan: '' })
  }

  return (
    <AppShell judul="Janji Temu" sub={`${daftar.length} total · ${daftar.filter((j) => j.status === 'menunggu').length} menunggu konfirmasi`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full sm:w-80"><Tab tab={['Janji Temu Saya', 'Buat Baru']} aktif={tab} onPilih={setTab} /></div>
        <Tombol ukuran="kecil" ikon="tambah" onClick={() => { setTab('Buat Baru'); setBuka(true) }}>Buat Janji Temu</Tombol>
      </div>

      {tab === 'Janji Temu Saya' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {daftar.map((j, i) => {
            const d = cariDokter(db, j.dokterId)
            const p = db.poli.find((x) => x.id === j.poliId)
            return (
              <motion.div key={j.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Kartu className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink-900">{d?.nama.split(',')[0]}</p>
                      <p className="truncate text-[12px] text-ink-500">{p?.nama}</p>
                    </div>
                    <Lencana className={cn('shrink-0 ring-1 ring-inset', j.status === 'dikonfirmasi' ? 'bg-brand-100 text-brand-700 ring-brand-200' : j.status === 'selesai' ? 'bg-ink-100 text-ink-600 ring-ink-200' : j.status === 'batal' ? 'bg-rose-100 text-rose-700 ring-rose-200' : 'bg-amber-100 text-amber-700 ring-amber-200')}>{j.status}</Lencana>
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-ink-50 px-3.5 py-3 text-[12.5px] text-ink-600">
                    <Calendar size={14} /> {tanggalPanjang(j.tanggal)}
                    <span className="mx-1 h-3 w-px bg-ink-200" />
                    <Clock size={14} /> {j.jam}
                  </div>
                  <p className="mt-3 line-clamp-2 text-[12.5px] text-ink-500">{j.alasan}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11.5px] font-medium text-ink-400">{j.kode}</span>
                    {j.status === 'menunggu' && (
                      <Tombol varian="tepi" ukuran="kecil" onClick={() => { statusJanjiTemu(j.id, 'batal'); tampilkan('Janji temu dibatalkan', undefined, 'peringatan') }} ikon="batal">Batalkan</Tombol>
                    )}
                  </div>
                </Kartu>
              </motion.div>
            )
          })}
          {daftar.length === 0 && (
            <div className="col-span-full rounded-3xl border border-ink-200 bg-white">
              <Kosong ikon="kalender" judul="Belum ada janji temu" pesan="Jadwalkan kunjungan bersama dokter pilihan Anda tanpa perlu antre panjang." aksi={<Tombol onClick={() => { setTab('Buat Baru'); setBuka(true) }}>Buat Janji Temu</Tombol>} />
            </div>
          )}
        </div>
      ) : (
        <Kartu className="p-6">
          <h3 className="text-[15px] font-semibold text-ink-900">Buat janji temu baru</h3>
          <p className="mt-1 text-[12.5px] text-ink-500">Slot otomatis mengikuti jadwal praktik dokter yang dipilih.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Pilih label="Cabang" opsi={db.cabang.map((c) => ({ nilai: c.id, label: c.nama, sub: c.kota, warna: c.warna }))} nilai={form.cabangId} onPilih={(v) => setForm({ ...form, cabangId: v, dokterId: '', jam: '' })} />
            <Pilih label="Dokter" opsi={dokterTersedia.map((d) => ({ nilai: d.id, label: d.nama, sub: d.spesialis }))} nilai={form.dokterId} onPilih={(v) => setForm({ ...form, dokterId: v, jam: '' })} galat={galat.dokter} carian />
            <Masukan label="Tanggal kunjungan" type="date" min={hariIniISO()} value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value, jam: '' })} galat={galat.tanggal} />
            <AreaTeks label="Alasan kunjungan" rows={2} value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} placeholder="cth. Kontrol tekanan darah rutin" />
          </div>

          <div className="mt-5">
            <p className="mb-2.5 text-[13px] font-medium text-ink-700">Pilih jam {jadwalDipilih.length === 0 && <span className="font-normal text-ink-400">(dokter tidak praktik pada hari {namaHari(new Date(form.tanggal).getDay())})</span>}</p>
            <div className="flex flex-wrap gap-2">
              {slot.map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, jam: s })}
                  className={cn('rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-all duration-200', form.jam === s ? 'border-brand-500 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50')}
                >
                  {s}
                </button>
              ))}
              {slot.length === 0 && <p className="text-[12.5px] text-ink-400">Semua slot terisi. Pilih tanggal lain.</p>}
            </div>
            {galat.jam && <p className="mt-2 text-xs font-medium text-rose-600">{galat.jam}</p>}
          </div>

          <div className="mt-6 flex gap-3">
            <Tombol onClick={simpan} ikon="centang">Simpan Janji Temu</Tombol>
            <Tombol varian="tepi" onClick={() => setTab('Janji Temu Saya')}>Batal</Tombol>
          </div>
        </Kartu>
      )}

      <Modal buka={buka} onTutup={() => setBuka(false)} judul="Janji Temu Baru" sub="Konfirmasi jadwal akan dikirim melalui notifikasi">
        <div className="space-y-4">
          <Pilih label="Dokter" opsi={dokterTersedia.map((d) => ({ nilai: d.id, label: d.nama, sub: d.spesialis }))} nilai={form.dokterId} onPilih={(v) => setForm({ ...form, dokterId: v, jam: '' })} carian />
          <Masukan label="Tanggal" type="date" min={hariIniISO()} value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
          <AreaTeks label="Alasan" rows={3} value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Tombol varian="tepi" onClick={() => setBuka(false)}>Tutup</Tombol>
            <Tombol onClick={simpan}>Simpan</Tombol>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}

/* -------------------------------------------------------------- riwayat */

export function PasienRiwayat() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  const [tab, setTab] = useState('Semua')
  const [detail, setDetail] = useState<Antrian | null>(null)

  const daftar = db.antrian
    .filter((a) => a.pasienId === sesi.id || a.telepon === sesi.telepon)
    .sort((a, b) => new Date(b.ambilPada).getTime() - new Date(a.ambilPada).getTime())

  const tersaring = daftar.filter((a) => {
    if (tab === 'Semua') return true
    if (tab === 'Selesai') return a.status === 'selesai'
    if (tab === 'Berjalan') return a.status === 'menunggu' || a.status === 'dipanggil' || a.status === 'dilayani'
    return a.status === 'batal'
  })

  const totalTunggu = daftar.filter((a) => a.dipanggilPada).reduce((s, a) => s + selisihMenit(a.ambilPada, a.dipanggilPada!), 0)

  return (
    <AppShell judul="Riwayat Kunjungan" sub={`${daftar.length} kunjungan tercatat`}>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KartuSorotan judul="Total kunjungan" nilai={<AngkaAnimasi nilai={daftar.length} />} ikon="riwayat" warna="#0c8672" />
        <KartuSorotan judul="Selesai dilayani" nilai={<AngkaAnimasi nilai={daftar.filter((a) => a.status === 'selesai').length} />} ikon="centang" warna="#3b82f6" />
        <KartuSorotan judul="Total waktu tunggu" nilai={<><AngkaAnimasi nilai={totalTunggu} /><span className="text-sm font-medium text-ink-400"> mnt</span></>} ikon="jam" warna="#d97706" />
      </div>

      <div className="mb-4 w-full sm:w-96"><Tab tab={['Semua', 'Berjalan', 'Selesai', 'Batal']} aktif={tab} onPilih={setTab} /></div>

      <Kartu className="overflow-hidden">
        {tersaring.length === 0 && <Kosong judul="Tidak ada data" pesan="Riwayat pada kategori ini masih kosong." />}
        {tersaring.map((a, i) => {
          const p = db.poli.find((x) => x.id === a.poliId)
          const d = cariDokter(db, a.dokterId)
          const tunggu = a.dipanggilPada ? selisihMenit(a.ambilPada, a.dipanggilPada) : null
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              onClick={() => setDetail(a)}
              className="flex w-full flex-wrap items-center gap-4 border-b border-ink-50 px-5 py-4 text-left transition-colors last:border-0 hover:bg-ink-50/60 sm:flex-nowrap"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${p?.warna}18` }}>
                <Ikon nama={p?.ikon ?? 'poli'} ukuran={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                  {a.kode}
                  <Lencana className={cn('ring-1 ring-inset', LABEL_PRIORITAS[a.prioritas].latar)} titik={LABEL_PRIORITAS[a.prioritas].titik}>{LABEL_PRIORITAS[a.prioritas].label}</Lencana>
                </p>
                <p className="truncate text-[12.5px] text-ink-500">{p?.nama} · {d?.nama.split(',')[0] ?? '-'} · {a.alasan}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-[12.5px] font-medium text-ink-700">{tanggalPanjang(a.ambilPada)}</p>
                <p className="text-[11.5px] text-ink-400">tunggu {tunggu ?? '-'} menit</p>
              </div>
              <Lencana className={cn('shrink-0 ring-1 ring-inset', a.status === 'selesai' ? 'bg-brand-100 text-brand-700 ring-brand-200' : a.status === 'batal' ? 'bg-rose-100 text-rose-700 ring-rose-200' : a.status === 'dipanggil' ? 'bg-blue-100 text-blue-700 ring-blue-200' : a.status === 'dilayani' ? 'bg-amber-100 text-amber-800 ring-amber-200' : 'bg-ink-100 text-ink-600 ring-ink-200')}>{a.status}</Lencana>
            </motion.button>
          )
        })}
      </Kartu>

      <Modal buka={!!detail} onTutup={() => setDetail(null)} judul={detail ? `Kunjungan ${detail.kode}` : ''} sub={detail ? tanggalPanjang(detail.ambilPada) : ''}>
        {detail && (
          <div className="space-y-5">
            <KartuTiket antrian={detail} />
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                { k: 'Waktu ambil', v: jam(detail.ambilPada) },
                { k: 'Waktu panggil', v: detail.dipanggilPada ? jam(detail.dipanggilPada) : '-' },
                { k: 'Mulai periksa', v: detail.dilayaniPada ? jam(detail.dilayaniPada) : '-' },
                { k: 'Selesai', v: detail.selesaiPada ? jam(detail.selesaiPada) : '-' },
                { k: 'Keluhan', v: detail.alasan },
                { k: 'Catatan dokter', v: detail.catatan ?? '-' },
              ].map((x) => (
                <div key={x.k} className="rounded-xl bg-ink-50 p-3">
                  <dt className="text-[11px] uppercase tracking-wide text-ink-400">{x.k}</dt>
                  <dd className="mt-1 font-medium text-ink-800">{x.v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex justify-end gap-2">
              <Tombol varian="tepi" onClick={() => setDetail(null)} ikonKanan={<X size={14} />}>Tutup</Tombol>
              <Tombol onClick={() => window.print()} ikon="cetak">Cetak</Tombol>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

/* -------------------------------------------------------------- privasi */

export function PasienPrivasi() {
  const sesi = pakaiPenggunaSesi()!
  const navigate = useNavigate()
  const { tampilkan } = gunakanToast()
  const [memuatEkspor, setMemuatEkspor] = useState(false)
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false)
  const [memuatHapus, setMemuatHapus] = useState(false)

  const unduh = async () => {
    setMemuatEkspor(true)
    try {
      await eksporDataSaya()
      tampilkan('Data diunduh', 'Berkas JSON berisi seluruh data Anda telah disimpan.')
    } catch (err) {
      tampilkan('Gagal mengunduh', err instanceof Error ? err.message : 'Coba lagi.', 'galat')
    } finally {
      setMemuatEkspor(false)
    }
  }

  const hapus = async () => {
    setMemuatHapus(true)
    try {
      await hapusAkunSaya()
      navigate('/')
    } catch (err) {
      tampilkan('Gagal menghapus akun', err instanceof Error ? err.message : 'Coba lagi.', 'galat')
      setMemuatHapus(false)
    }
  }

  return (
    <AppShell judul="Privasi & Data Saya" sub="Kelola data pribadi yang tersimpan di akun Anda">
      <div className="mx-auto max-w-xl space-y-5">
        <Kartu className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><ShieldCheck size={19} /></span>
            <div>
              <h2 className="text-[14.5px] font-semibold text-ink-900">Persetujuan Anda</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
                {sesi.persetujuanPada
                  ? `Anda menyetujui Kebijakan Privasi VitaCare pada ${tanggalPanjang(sesi.persetujuanPada)}.`
                  : 'Belum ada catatan persetujuan untuk akun ini.'}{' '}
                <Link to="/kebijakan-privasi" target="_blank" className="font-semibold text-brand-700 hover:text-brand-800">Baca kebijakan lengkap</Link>
              </p>
            </div>
          </div>
        </Kartu>

        <Kartu className="p-6">
          <h2 className="text-[14.5px] font-semibold text-ink-900">Unduh data saya</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            Dapatkan salinan seluruh data pribadi, riwayat antrian, dan janji temu yang tersimpan tentang Anda, dalam format JSON.
          </p>
          <Tombol className="mt-4" varian="tepi" onClick={unduh} memuat={memuatEkspor} ikon="unduh">Unduh Data Saya</Tombol>
        </Kartu>

        <Kartu className="border-rose-200 p-6">
          <h2 className="text-[14.5px] font-semibold text-rose-700">Hapus akun & data pribadi</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            Nama, email, NIK, dan nomor telepon Anda akan dihapus permanen dan akun dinonaktifkan. Riwayat antrian tetap
            tersimpan tanpa identitas Anda untuk keperluan audit operasional. Tindakan ini tidak dapat dibatalkan.
          </p>
          <Tombol className="mt-4" varian="bahaya" onClick={() => setKonfirmasiHapus(true)} ikon="hapus">Hapus Akun Saya</Tombol>
        </Kartu>
      </div>

      <ModalKonfirmasi
        buka={konfirmasiHapus}
        onTutup={() => setKonfirmasiHapus(false)}
        judul="Hapus akun & data pribadi?"
        pesan="Nama, email, NIK, dan telepon Anda akan dihapus permanen. Anda akan langsung keluar dan tidak bisa masuk lagi dengan akun ini. Lanjutkan?"
        onKonfirmasi={() => { if (!memuatHapus) void hapus() }}
      />
    </AppShell>
  )
}

export const IkonTambah = Plus
export const IkonCentang = Check
export const IkonTutup = X
