import { useMemo, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { Ikon } from '../components/Icon'
import { AppShell, KartuSorotan } from '../components/AppShell'
import { AngkaAnimasi } from '../components/charts'
import { Avatar, Kartu, Kosong, Lencana, Masukan, Modal, Pilih, Sakelar, Tab, Tombol, gunakanToast } from '../components/ui'
import {
  hapusCabang, hapusDokter, hapusJadwal, hapusPoli, pakaiDB, simpanCabang, simpanDokter,
  simpanJadwal, simpanPoli,
} from '../lib/db'
import { cn, keCSV, namaHari, uid, unduhBerkas } from '../lib/utils'
import type { Cabang, Dokter, Jadwal, Poli } from '../lib/types'

const WARNA = ['#0c8672', '#f59e0b', '#14b8a6', '#ec4899', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#64748b', '#dc2626']
const IKON_POLI = ['stetoskop', 'keluarga', 'gigi', 'hamil', 'jantung', 'mata', 'tht', 'kulit', 'saraf', 'ambulans', 'pil', 'bedah']

/* --------------------------------------------------------------- dokter */

const KOSONG_DOKTER: Dokter = {
  id: '', nama: '', spesialis: '', sip: '', poliId: '', telepon: '', email: '',
  foto: '/img/dokter1.jpg', rating: 4.8, aktif: true, bergabung: new Date().toISOString().slice(0, 10),
}

export function AdminDokter() {
  const db = pakaiDB()
  const { tampilkan } = gunakanToast()
  const [form, setForm] = useState<Dokter | null>(null)
  const [kueri, setKueri] = useState('')
  const [hapus, setHapus] = useState<Dokter | null>(null)

  const daftar = db.dokter.filter((d) => d.nama.toLowerCase().includes(kueri.toLowerCase()) || db.poli.find((p) => p.id === d.poliId)?.nama.toLowerCase().includes(kueri.toLowerCase()))

  const simpan = () => {
    if (!form) return
    if (form.nama.trim().length < 4 || !form.poliId) return tampilkan('Data belum lengkap', 'Nama dan poli wajib diisi.', 'galat')
    const baru = form.id ? form : { ...form, id: uid('dok') }
    simpanDokter(baru)
    tampilkan(form.id ? 'Dokter diperbarui' : 'Dokter ditambahkan', baru.nama)
    setForm(null)
  }

  const ekspor = () => {
    unduhBerkas('data-dokter.csv', keCSV(['Nama', 'Spesialis', 'Poli', 'SIP', 'Telepon', 'Email', 'Rating', 'Aktif'], daftar.map((d) => [d.nama, d.spesialis, db.poli.find((p) => p.id === d.poliId)?.nama ?? '', d.sip, d.telepon, d.email, d.rating, d.aktif ? 'ya' : 'tidak'])), 'text/csv')
    tampilkan('Data diekspor', `${daftar.length} dokter tersimpan ke CSV.`)
  }

  return (
    <AppShell
      judul="Data Dokter" sub={`${db.dokter.length} dokter terdaftar`}
      aksi={
        <>
          <input value={kueri} onChange={(e) => setKueri(e.target.value)} placeholder="Cari dokter / poli…" className="h-9 flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-[13px] sm:max-w-xs" />
          <Tombol varian="tepi" ukuran="kecil" onClick={ekspor} ikonKanan={<Download size={13} />}>Ekspor CSV</Tombol>
          <Tombol ukuran="kecil" ikon="tambah" onClick={() => setForm({ ...KOSONG_DOKTER, poliId: db.poli[0]?.id ?? '' })}>Tambah Dokter</Tombol>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {daftar.map((d, i) => {
          const poli = db.poli.find((p) => p.id === d.poliId)
          const jadwal = db.jadwal.filter((j) => j.dokterId === d.id).length
          const kunjungan = db.antrian.filter((a) => a.dokterId === d.id).length
          return (
            <Kartu key={d.id} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar nama={d.nama} url={d.foto} ukuran={54} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-ink-900">{d.nama}</p>
                  <p className="truncate text-[12.5px] text-ink-500">{d.spesialis}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Lencana className="ring-1 ring-inset" titik="bg-current" >
                      <span className="flex items-center gap-1.5" style={{ color: poli?.warna }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: poli?.warna }} />{poli?.nama}</span>
                    </Lencana>
                    <Lencana className={cn('ring-1 ring-inset', d.aktif ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-rose-50 text-rose-600 ring-rose-200')}>{d.aktif ? 'aktif' : 'nonaktif'}</Lencana>
                  </div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { k: 'Kunjungan', v: kunjungan },
                  { k: 'Jadwal', v: jadwal },
                  { k: 'Rating', v: d.rating },
                ].map((x) => (
                  <div key={x.k} className="rounded-xl bg-ink-50 py-2.5">
                    <dt className="text-[10px] uppercase tracking-wide text-ink-400">{x.k}</dt>
                    <dd className="mt-0.5 text-[13.5px] font-semibold text-ink-800">{x.v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11.5px] text-ink-400">SIP {d.sip} · {d.telepon}</p>
              <div className="mt-4 flex gap-2">
                <Tombol varian="tepi" ukuran="kecil" lebar onClick={() => setForm(d)} ikon="edit">Edit</Tombol>
                <Tombol varian="tepi" ukuran="kecil" onClick={() => setHapus(d)} className="text-rose-600 hover:border-rose-300 hover:bg-rose-50" ikonKanan={<Trash2 size={13} />} />
              </div>
              <span className="sr-only">{i}</span>
            </Kartu>
          )
        })}
        {daftar.length === 0 && <div className="col-span-full rounded-3xl border border-ink-200 bg-white"><Kosong ikon="dokter" judul="Dokter tidak ditemukan" pesan="Coba kata kunci lain atau tambah dokter baru." /></div>}
      </div>

      <Modal buka={!!form} onTutup={() => setForm(null)} judul={form?.id ? 'Edit Dokter' : 'Tambah Dokter'} lebar="besar">
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Masukan label="Nama lengkap & gelar" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="dr. Nama, Sp.X" />
              <Masukan label="Spesialisasi" value={form.spesialis} onChange={(e) => setForm({ ...form, spesialis: e.target.value })} placeholder="Spesialis Penyakit Dalam" />
              <Pilih label="Poli" opsi={db.poli.map((p) => ({ nilai: p.id, label: p.nama, warna: p.warna }))} nilai={form.poliId} onPilih={(v) => setForm({ ...form, poliId: v })} />
              <Masukan label="Nomor SIP" value={form.sip} onChange={(e) => setForm({ ...form, sip: e.target.value })} placeholder="SIP-XXXXXXX" />
              <Masukan label="Telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="0812xxxxxxx" />
              <Masukan label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dokter@vitacare.id" />
            </div>
            <div>
              <span className="mb-2 block text-[13px] font-medium text-ink-700">Foto profil</span>
              <div className="flex flex-wrap gap-2">
                {['/img/dokter1.jpg', '/img/dokter2.jpg', '/img/dokter3.jpg', '/img/dokter4.jpg'].map((f) => (
                  <button key={f} onClick={() => setForm({ ...form, foto: f })} className={cn('overflow-hidden rounded-xl border-2 transition', form.foto === f ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-transparent hover:border-ink-200')}>
                    <img src={f} alt="" className="h-14 w-14 object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <Sakelar label="Status aktif" deskripsi="Dokter dapat dipilih pada jadwal dan antrian" aktif={form.aktif} onUbah={(v) => setForm({ ...form, aktif: v })} />
            <div className="flex justify-end gap-2 pt-2">
              <Tombol varian="tepi" onClick={() => setForm(null)}>Batal</Tombol>
              <Tombol onClick={simpan} ikon="centang">Simpan Dokter</Tombol>
            </div>
          </div>
        )}
      </Modal>

      <ModalKonfirmasi
        buka={!!hapus} onTutup={() => setHapus(null)} judul="Hapus dokter?"
        pesan={`Data ${hapus?.nama} akan dihapus permanen beserta jadwal praktiknya.`}
        onKonfirmasi={() => { if (hapus) { hapusDokter(hapus.id); tampilkan('Dokter dihapus', hapus.nama, 'peringatan') } setHapus(null) }}
      />
    </AppShell>
  )
}

export function ModalKonfirmasi({ buka, onTutup, judul, pesan, onKonfirmasi }: { buka: boolean; onTutup: () => void; judul: string; pesan: string; onKonfirmasi: () => void }) {
  return (
    <Modal buka={buka} onTutup={onTutup} judul={judul} lebar="kecil">
      <p className="text-[13.5px] leading-relaxed text-ink-500">{pesan}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Tombol varian="tepi" onClick={onTutup}>Batal</Tombol>
        <Tombol varian="bahaya" onClick={onKonfirmasi} ikon="hapus">Ya, hapus</Tombol>
      </div>
    </Modal>
  )
}

/* ----------------------------------------------------------------- poli */

const KOSONG_POLI: Poli = {
  id: '', kode: '', nama: '', deskripsi: '', ruang: '', lantai: 'Lantai 1', warna: '#0c8672',
  ikon: 'stetoskop', rataLayanan: 6, cabangIds: [], aktif: true,
}

export function AdminPoli() {
  const db = pakaiDB()
  const { tampilkan } = gunakanToast()
  const [form, setForm] = useState<Poli | null>(null)
  const [hapus, setHapus] = useState<Poli | null>(null)

  const simpan = () => {
    if (!form) return
    if (form.nama.trim().length < 3 || form.kode.trim().length < 2) return tampilkan('Data belum lengkap', 'Nama dan kode poli wajib diisi.', 'galat')
    const baru = form.id ? form : { ...form, id: uid('poli'), kode: form.kode.toUpperCase() }
    simpanPoli(baru)
    tampilkan(form.id ? 'Poli diperbarui' : 'Poli ditambahkan', baru.nama)
    setForm(null)
  }

  const ekspor = () => {
    unduhBerkas('data-poli.csv', keCSV(['Kode', 'Nama', 'Ruang', 'Lantai', 'Rata layanan', 'Cabang', 'Aktif'], db.poli.map((p) => [p.kode, p.nama, p.ruang, p.lantai, p.rataLayanan, p.cabangIds.length, p.aktif ? 'ya' : 'tidak'])), 'text/csv')
    tampilkan('Data diekspor', 'Data poli tersimpan ke CSV.')
  }

  return (
    <AppShell
      judul="Data Poli" sub={`${db.poli.length} poli terdaftar`}
      aksi={
        <>
          <Tombol varian="tepi" ukuran="kecil" onClick={ekspor} ikonKanan={<Download size={13} />}>Ekspor CSV</Tombol>
          <Tombol ukuran="kecil" ikon="tambah" onClick={() => setForm({ ...KOSONG_POLI, cabangIds: db.cabang.map((c) => c.id) })}>Tambah Poli</Tombol>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {db.poli.map((p) => {
          const dokter = db.dokter.filter((d) => d.poliId === p.id).length
          const kunjungan = db.antrian.filter((a) => a.poliId === p.id).length
          return (
            <Kartu key={p.id} className="relative overflow-hidden p-5">
              <span className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-[0.08]" style={{ background: p.warna }} />
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${p.warna}18` }}>
                  <Ikon nama={p.ikon} ukuran={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide" style={{ background: `${p.warna}18`, color: p.warna }}>{p.kode}</span>
                    <h3 className="truncate text-[14.5px] font-semibold text-ink-900">{p.nama}</h3>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-500">{p.deskripsi}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { k: 'Dokter', v: dokter },
                  { k: 'Kunjungan', v: kunjungan },
                  { k: 'Rata layan', v: `${p.rataLayanan}m` },
                ].map((x) => (
                  <div key={x.k} className="rounded-xl bg-ink-50 py-2.5">
                    <dt className="text-[10px] uppercase tracking-wide text-ink-400">{x.k}</dt>
                    <dd className="mt-0.5 text-[13.5px] font-semibold text-ink-800">{x.v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11.5px] text-ink-400">{p.ruang} · {p.lantai} · {p.cabangIds.length} cabang</p>
              <div className="mt-4 flex gap-2">
                <Tombol varian="tepi" ukuran="kecil" lebar onClick={() => setForm(p)} ikon="edit">Edit</Tombol>
                <Tombol varian="tepi" ukuran="kecil" onClick={() => setHapus(p)} className="text-rose-600 hover:border-rose-300 hover:bg-rose-50" ikonKanan={<Trash2 size={13} />} />
              </div>
            </Kartu>
          )
        })}
      </div>

      <Modal buka={!!form} onTutup={() => setForm(null)} judul={form?.id ? 'Edit Poli' : 'Tambah Poli'} lebar="besar">
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Masukan label="Nama poli" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth. Poli Jantung" />
              <Masukan label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase().slice(0, 5) })} placeholder="JAN" />
              <Masukan label="Ruang" value={form.ruang} onChange={(e) => setForm({ ...form, ruang: e.target.value })} placeholder="Ruang D-01" />
              <Masukan label="Lantai" value={form.lantai} onChange={(e) => setForm({ ...form, lantai: e.target.value })} placeholder="Lantai 3" />
              <Masukan label="Rata-rata pelayanan (menit)" type="number" min={1} max={60} value={form.rataLayanan} onChange={(e) => setForm({ ...form, rataLayanan: Number(e.target.value) || 5 })} />
            </div>
            <Masukan label="Deskripsi" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Layanan yang tersedia di poli ini" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-2 block text-[13px] font-medium text-ink-700">Warna</span>
                <div className="flex flex-wrap gap-2">
                  {WARNA.map((w) => (
                    <button key={w} onClick={() => setForm({ ...form, warna: w })} className={cn('h-8 w-8 rounded-lg transition-transform', form.warna === w ? 'scale-110 ring-2 ring-ink-900 ring-offset-2' : 'hover:scale-105')} style={{ background: w }} />
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-2 block text-[13px] font-medium text-ink-700">Ikon</span>
                <div className="flex flex-wrap gap-2">
                  {IKON_POLI.map((ik) => (
                    <button key={ik} onClick={() => setForm({ ...form, ikon: ik })} className={cn('flex h-9 w-9 items-center justify-center rounded-lg border transition', form.ikon === ik ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/20' : 'border-ink-200 hover:border-brand-200')}>
                      <Ikon nama={ik} ukuran={17} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <span className="mb-2 block text-[13px] font-medium text-ink-700">Tersedia di cabang</span>
              <div className="flex flex-wrap gap-2">
                {db.cabang.map((c) => {
                  const aktif = form.cabangIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => setForm({ ...form, cabangIds: aktif ? form.cabangIds.filter((x) => x !== c.id) : [...form.cabangIds, c.id] })}
                      className={cn('flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition', aktif ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:border-brand-200')}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.warna }} />
                      {c.nama}
                    </button>
                  )
                })}
              </div>
            </div>
            <Sakelar label="Poli aktif" deskripsi="Poli aktif dapat menerima pasien" aktif={form.aktif} onUbah={(v) => setForm({ ...form, aktif: v })} />
            <div className="flex justify-end gap-2 pt-2">
              <Tombol varian="tepi" onClick={() => setForm(null)}>Batal</Tombol>
              <Tombol onClick={simpan} ikon="centang">Simpan Poli</Tombol>
            </div>
          </div>
        )}
      </Modal>

      <ModalKonfirmasi
        buka={!!hapus} onTutup={() => setHapus(null)} judul="Hapus poli?"
        pesan={`Poli ${hapus?.nama} akan dihapus. Riwayat antrian lama tetap tersimpan.`}
        onKonfirmasi={() => { if (hapus) { hapusPoli(hapus.id); tampilkan('Poli dihapus', hapus.nama, 'peringatan') } setHapus(null) }}
      />
    </AppShell>
  )
}

/* --------------------------------------------------------------- jadwal */

export function AdminJadwal() {
  const db = pakaiDB()
  const { tampilkan } = gunakanToast()
  const [filter, setFilter] = useState('')
  const [buka, setBuka] = useState(false)
  const [hapus, setHapus] = useState<Jadwal | null>(null)
  const [form, setForm] = useState<Omit<Jadwal, 'id'>>({ dokterId: '', hari: 1, mulai: '08:00', selesai: '12:00', kuota: 24, cabangId: 'cbg_jkt', aktif: true })

  const daftar = useMemo(() => {
    return db.jadwal
      .filter((j) => !filter || j.dokterId === filter)
      .sort((a, b) => a.hari - b.hari || a.mulai.localeCompare(b.mulai))
  }, [db.jadwal, filter])

  const simpan = () => {
    if (!form.dokterId) return tampilkan('Pilih dokter', 'Dokter wajib dipilih untuk jadwal baru.', 'galat')
    simpanJadwal({ ...form, id: uid('jdw') })
    tampilkan('Jadwal ditambahkan', `${namaHari(form.hari)} ${form.mulai}–${form.selesai}`)
    setBuka(false)
  }

  const ekspor = () => {
    unduhBerkas('jadwal-praktik.csv', keCSV(['Dokter', 'Poli', 'Hari', 'Mulai', 'Selesai', 'Kuota', 'Cabang'], daftar.map((j) => [db.dokter.find((d) => d.id === j.dokterId)?.nama ?? '', db.poli.find((p) => p.id === db.dokter.find((d) => d.id === j.dokterId)?.poliId)?.nama ?? '', namaHari(j.hari), j.mulai, j.selesai, j.kuota, db.cabang.find((c) => c.id === j.cabangId)?.nama ?? ''])), 'text/csv')
    tampilkan('Jadwal diekspor', `${daftar.length} slot tersimpan ke CSV.`)
  }

  return (
    <AppShell
      judul="Jadwal Praktik" sub={`${db.jadwal.length} slot jadwal aktif`}
      aksi={
        <>
          <div className="w-56"><Pilih kecil opsi={[{ nilai: '', label: 'Semua dokter' }, ...db.dokter.map((d) => ({ nilai: d.id, label: d.nama.split(',')[0], sub: d.spesialis }))]} nilai={filter} onPilih={setFilter} carian /></div>
          <Tombol varian="tepi" ukuran="kecil" onClick={ekspor} ikonKanan={<Download size={13} />}>Ekspor</Tombol>
          <Tombol ukuran="kecil" ikon="tambah" onClick={() => { setForm({ ...form, dokterId: filter || db.dokter[0]?.id || '' }); setBuka(true) }}>Tambah Jadwal</Tombol>
        </>
      }
    >
      <Kartu className="overflow-hidden">
        <div className="hidden grid-cols-[1fr_8rem_7rem_7rem_6rem_1fr_5rem] gap-4 border-b border-ink-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400 lg:grid">
          <span>Dokter</span><span>Hari</span><span>Jam</span><span>Kuota</span><span>Cabang</span><span>Poli</span><span>Aksi</span>
        </div>
        {daftar.map((j) => {
          const d = db.dokter.find((x) => x.id === j.dokterId)
          const p = db.poli.find((x) => x.id === d?.poliId)
          return (
            <div key={j.id} className={cn('grid gap-2 border-b border-ink-50 px-5 py-3.5 last:border-0 lg:grid-cols-[1fr_8rem_7rem_7rem_6rem_1fr_5rem] lg:items-center lg:gap-4', j.hari === new Date().getDay() && 'bg-brand-50/40')}>
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar nama={d?.nama ?? '?'} url={d?.foto} ukuran={32} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink-800">{d?.nama.split(',')[0] ?? '—'}</p>
                  <p className="truncate text-[11px] text-ink-400">{d?.spesialis}</p>
                </div>
              </div>
              <span className={cn('text-[12.5px] font-medium', j.hari === new Date().getDay() ? 'text-brand-700' : 'text-ink-600')}>{namaHari(j.hari)}</span>
              <span className="text-[12.5px] text-ink-600">{j.mulai}–{j.selesai}</span>
              <span className="text-[12.5px] text-ink-600">{j.kuota} pasien</span>
              <span className="text-[12px] text-ink-500">{db.cabang.find((c) => c.id === j.cabangId)?.kode}</span>
              <span className="flex items-center gap-2 text-[12.5px] text-ink-600"><span className="h-2 w-2 rounded-full" style={{ background: p?.warna }} />{p?.nama}</span>
              <div className="flex gap-1.5">
                <Tombol varian="tepi" ukuran="kecil" onClick={() => { simpanJadwal({ ...j, aktif: !j.aktif }); tampilkan(j.aktif ? 'Jadwal dinonaktifkan' : 'Jadwal diaktifkan') }}>{j.aktif ? 'Nonaktif' : 'Aktif'}</Tombol>
                <button onClick={() => setHapus(j)} className="rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        })}
        {daftar.length === 0 && <Kosong ikon="jadwal" judul="Jadwal kosong" pesan="Tambahkan jadwal praktik agar pasien dapat membuat janji temu." aksi={<Tombol onClick={() => setBuka(true)}>Tambah Jadwal</Tombol>} />}
      </Kartu>

      <Modal buka={buka} onTutup={() => setBuka(false)} judul="Tambah Jadwal Praktik">
        <div className="space-y-4">
          <Pilih label="Dokter" opsi={db.dokter.map((d) => ({ nilai: d.id, label: d.nama, sub: d.spesialis }))} nilai={form.dokterId} onPilih={(v) => setForm({ ...form, dokterId: v })} carian />
          <div className="grid gap-4 sm:grid-cols-2">
            <Pilih label="Hari" opsi={[1, 2, 3, 4, 5, 6].map((h) => ({ nilai: String(h), label: namaHari(h) }))} nilai={String(form.hari)} onPilih={(v) => setForm({ ...form, hari: Number(v) })} />
            <Pilih label="Cabang" opsi={db.cabang.map((c) => ({ nilai: c.id, label: c.nama, warna: c.warna }))} nilai={form.cabangId} onPilih={(v) => setForm({ ...form, cabangId: v })} />
            <Masukan label="Jam mulai" type="time" value={form.mulai} onChange={(e) => setForm({ ...form, mulai: e.target.value })} />
            <Masukan label="Jam selesai" type="time" value={form.selesai} onChange={(e) => setForm({ ...form, selesai: e.target.value })} />
            <Masukan label="Kuota pasien" type="number" min={1} value={form.kuota} onChange={(e) => setForm({ ...form, kuota: Number(e.target.value) || 1 })} />
          </div>
          <div className="flex justify-end gap-2">
            <Tombol varian="tepi" onClick={() => setBuka(false)}>Batal</Tombol>
            <Tombol onClick={simpan} ikon="centang">Simpan Jadwal</Tombol>
          </div>
        </div>
      </Modal>

      <ModalKonfirmasi buka={!!hapus} onTutup={() => setHapus(null)} judul="Hapus jadwal?" pesan="Slot jadwal ini akan dihapus dari daftar praktik." onKonfirmasi={() => { if (hapus) { hapusJadwal(hapus.id); tampilkan('Jadwal dihapus', undefined, 'peringatan') } setHapus(null) }} />
    </AppShell>
  )
}

/* --------------------------------------------------------------- cabang */

const KOSONG_CABANG: Cabang = { id: '', kode: '', nama: '', kota: '', alamat: '', telepon: '', warna: '#0c8672', aktif: true }

export function AdminCabang() {
  const db = pakaiDB()
  const { tampilkan } = gunakanToast()
  const [form, setForm] = useState<Cabang | null>(null)
  const [hapus, setHapus] = useState<Cabang | null>(null)
  const [tab, setTab] = useState('Kartu')

  const simpan = () => {
    if (!form) return
    if (form.nama.trim().length < 3) return tampilkan('Nama cabang wajib diisi', undefined, 'galat')
    const baru = form.id ? form : { ...form, id: uid('cbg'), kode: form.kode || `VIT-${form.kota.slice(0, 3).toUpperCase()}` }
    simpanCabang(baru)
    tampilkan(form.id ? 'Cabang diperbarui' : 'Cabang ditambahkan', baru.nama)
    setForm(null)
  }

  const total = db.antrian.length

  return (
    <AppShell
      judul="Multi Cabang" sub={`${db.cabang.length} cabang · ${total} total antrian`}
      aksi={
        <>
          <div className="w-40"><Tab tab={['Kartu', 'Tabel']} aktif={tab} onPilih={setTab} /></div>
          <Tombol ukuran="kecil" ikon="tambah" onClick={() => setForm({ ...KOSONG_CABANG })}>Tambah Cabang</Tombol>
        </>
      }
    >
      {tab === 'Kartu' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {db.cabang.map((c) => {
            const antrian = db.antrian.filter((a) => a.cabangId === c.id)
            const hariIni = antrian.filter((a) => a.ambilPada.slice(0, 10) === new Date().toISOString().slice(0, 10))
            const poli = db.poli.filter((p) => p.cabangIds.includes(c.id)).length
            const dokter = db.dokter.filter((d) => db.poli.some((p) => p.id === d.poliId && p.cabangIds.includes(c.id))).length
            return (
              <Kartu key={c.id} className="relative overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: c.warna }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[15.5px] font-semibold text-ink-900">{c.nama}</h3>
                        <Lencana className={cn('ring-1 ring-inset', c.aktif ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-rose-50 text-rose-600 ring-rose-200')}>{c.aktif ? 'aktif' : 'nonaktif'}</Lencana>
                      </div>
                      <p className="mt-0.5 text-[12.5px] text-ink-500">{c.kode} · {c.kota}</p>
                      <p className="mt-2 text-[12px] leading-relaxed text-ink-400">{c.alamat}</p>
                      <p className="mt-1 text-[12px] text-ink-400">{c.telepon}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${c.warna}18` }}>
                      <Ikon nama="cabang" ukuran={19} />
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[
                      { k: 'Poli', v: poli }, { k: 'Dokter', v: dokter },
                      { k: 'Hari ini', v: hariIni.length }, { k: 'Total', v: antrian.length },
                    ].map((x) => (
                      <div key={x.k} className="rounded-xl bg-ink-50 py-2.5">
                        <dt className="text-[10px] uppercase tracking-wide text-ink-400">{x.k}</dt>
                        <dd className="mt-0.5 text-[13.5px] font-semibold text-ink-800"><AngkaAnimasi nilai={x.v} /></dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <Tombol varian="tepi" ukuran="kecil" lebar onClick={() => setForm(c)} ikon="edit">Edit</Tombol>
                    {db.cabang.length > 1 && (
                      <Tombol varian="tepi" ukuran="kecil" onClick={() => setHapus(c)} className="text-rose-600 hover:border-rose-300 hover:bg-rose-50" ikonKanan={<Trash2 size={13} />} />
                    )}
                  </div>
                </div>
              </Kartu>
            )
          })}
        </div>
      ) : (
        <Kartu className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-3 font-semibold">Cabang</th><th className="px-5 py-3 font-semibold">Kota</th>
                  <th className="px-5 py-3 font-semibold">Telepon</th><th className="px-5 py-3 font-semibold">Poli</th>
                  <th className="px-5 py-3 font-semibold">Antrian total</th><th className="px-5 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {db.cabang.map((c) => (
                  <tr key={c.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50">
                    <td className="px-5 py-3.5"><span className="flex items-center gap-2.5"><span className="h-7 w-1.5 rounded-full" style={{ background: c.warna }} /><span className="font-semibold text-ink-800">{c.nama}</span></span></td>
                    <td className="px-5 py-3.5 text-ink-600">{c.kota}</td>
                    <td className="px-5 py-3.5 text-ink-600">{c.telepon}</td>
                    <td className="px-5 py-3.5 text-ink-600">{db.poli.filter((p) => p.cabangIds.includes(c.id)).length}</td>
                    <td className="px-5 py-3.5 font-semibold text-ink-800">{db.antrian.filter((a) => a.cabangId === c.id).length}</td>
                    <td className="px-5 py-3.5"><Tombol varian="tepi" ukuran="kecil" onClick={() => setForm(c)}>Edit</Tombol></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>
      )}

      <Modal buka={!!form} onTutup={() => setForm(null)} judul={form?.id ? 'Edit Cabang' : 'Tambah Cabang'}>
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Masukan label="Nama cabang" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth. VitaCare Kelapa Gading" />
              <Masukan label="Kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })} placeholder="VIT-KGA" />
              <Masukan label="Kota" value={form.kota} onChange={(e) => setForm({ ...form, kota: e.target.value })} placeholder="Jakarta Utara" />
              <Masukan label="Telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="021-xxx-xxxx" />
            </div>
            <Masukan label="Alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Jl. ..." />
            <div>
              <span className="mb-2 block text-[13px] font-medium text-ink-700">Warna identitas</span>
              <div className="flex flex-wrap gap-2">
                {WARNA.map((w) => (
                  <button key={w} onClick={() => setForm({ ...form, warna: w })} className={cn('h-8 w-8 rounded-lg transition-transform', form.warna === w ? 'scale-110 ring-2 ring-ink-900 ring-offset-2' : 'hover:scale-105')} style={{ background: w }} />
                ))}
              </div>
            </div>
            <Sakelar label="Cabang aktif" aktif={form.aktif} onUbah={(v) => setForm({ ...form, aktif: v })} />
            <div className="flex justify-end gap-2">
              <Tombol varian="tepi" onClick={() => setForm(null)}>Batal</Tombol>
              <Tombol onClick={simpan} ikon="centang">Simpan Cabang</Tombol>
            </div>
          </div>
        )}
      </Modal>

      <ModalKonfirmasi buka={!!hapus} onTutup={() => setHapus(null)} judul="Hapus cabang?" pesan={`Cabang ${hapus?.nama} akan dihapus dari daftar.`} onKonfirmasi={() => { if (hapus) { hapusCabang(hapus.id); tampilkan('Cabang dihapus', hapus.nama, 'peringatan') } setHapus(null) }} />
    </AppShell>
  )
}
