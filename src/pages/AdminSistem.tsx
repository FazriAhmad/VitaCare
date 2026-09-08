import { useMemo, useState } from 'react'
import { Download, Printer, RotateCcw, Trash2 } from 'lucide-react'
import { AppShell, KartuSorotan } from '../components/AppShell'
import { AngkaAnimasi } from '../components/charts'
import { Avatar, Kartu, Kosong, Lencana, Masukan, Modal, Pilih, Sakelar, Tab, Tombol, gunakanToast } from '../components/ui'
import { ModalKonfirmasi } from './AdminMaster'
import {
  hapusPengguna, pakaiDB, pakaiPenggunaSesi, resetSistem, simpanPengguna, simpanPengaturan,
  ubahIzin, ubahPeran,
} from '../lib/db'
import { DAFTAR_IZIN, IZIN_BAWAAN, PERAN, boleh, hitungIzin, labelPeran } from '../lib/permissions'
import { cn, keCSV, relatifWaktu, tanggalPendek, unduhBerkas } from '../lib/utils'
import type { Peran, Pengguna } from '../lib/types'

/* ------------------------------------------------------------- pengguna */

export function AdminPengguna() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  const { tampilkan } = gunakanToast()
  const [pilih, setPilih] = useState<Pengguna | null>(null)
  const [tambah, setTambah] = useState(false)
  const [hapus, setHapus] = useState<Pengguna | null>(null)
  const [kueri, setKueri] = useState('')
  const [form, setForm] = useState({ nama: '', email: '', sandi: '', telepon: '', peran: 'pasien' as Peran })

  const daftar = db.pengguna.filter((p) => p.nama.toLowerCase().includes(kueri.toLowerCase()) || p.email.toLowerCase().includes(kueri.toLowerCase()))
  const aktif = pilih ? db.pengguna.find((p) => p.id === pilih.id) ?? pilih : null
  const izinAktif = aktif ? hitungIzin(aktif) : new Set<string>()

  const simpanBaru = () => {
    if (form.nama.trim().length < 3 || !form.email.includes('@') || form.sandi.length < 5) {
      tampilkan('Data belum lengkap', 'Nama, email, dan sandi minimal 5 karakter wajib diisi.', 'galat')
      return
    }
    simpanPengguna({
      id: `pgu_${Date.now().toString(36)}`, nama: form.nama, email: form.email, sandi: form.sandi,
      peran: form.peran, telepon: form.telepon, aktif: true, izinTambahan: [], izinDicabut: [],
      dibuatPada: new Date().toISOString(), cabangId: db.cabang[0]?.id,
    })
    tampilkan('Pengguna ditambahkan', `${form.nama} (${labelPeran(form.peran)})`)
    setTambah(false)
    setForm({ nama: '', email: '', sandi: '', telepon: '', peran: 'pasien' })
  }

  const ekspor = () => {
    unduhBerkas('data-pengguna.csv', keCSV(['Nama', 'Email', 'Peran', 'Telepon', 'Aktif', 'Izin tambahan', 'Izin dicabut'], daftar.map((p) => [p.nama, p.email, p.peran, p.telepon, p.aktif ? 'ya' : 'tidak', p.izinTambahan.join(', '), p.izinDicabut.join(', ')])), 'text/csv')
    tampilkan('Diekspor', `${daftar.length} pengguna tersimpan.`)
  }

  const grupIzin = Array.from(new Set(DAFTAR_IZIN.map((i) => i.grup)))

  return (
    <AppShell
      judul="Pengguna & Perizinan" sub={`${db.pengguna.length} akun · 4 peran`}
      aksi={
        <>
          <input value={kueri} onChange={(e) => setKueri(e.target.value)} placeholder="Cari pengguna…" className="h-9 flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-[13px] sm:max-w-xs" />
          <Tombol varian="tepi" ukuran="kecil" onClick={ekspor} ikonKanan={<Download size={13} />}>Ekspor</Tombol>
          <Tombol ukuran="kecil" ikon="tambah" onClick={() => setTambah(true)}>Tambah Pengguna</Tombol>
        </>
      }
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PERAN.map((r) => (
          <Kartu key={r.id} className="p-5">
            <div className="flex items-center justify-between">
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', r.latar)}>{r.label}</span>
              <span className="text-xl font-semibold text-ink-900">{db.pengguna.filter((p) => p.peran === r.id).length}</span>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-500">{r.deskripsi}</p>
            <p className="mt-2 text-[11px] text-ink-400">{IZIN_BAWAAN[r.id].length} izin bawaan</p>
          </Kartu>
        ))}
      </div>

      <Kartu className="overflow-hidden">
        <div className="hidden grid-cols-[1fr_9rem_9rem_8rem_7rem] gap-4 border-b border-ink-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400 lg:grid">
          <span>Pengguna</span><span>Peran</span><span>Izin efektif</span><span>Terakhir login</span><span>Aksi</span>
        </div>
        {daftar.map((p) => {
          const izin = hitungIzin(p)
          return (
            <div key={p.id} className="grid gap-2 border-b border-ink-50 px-5 py-3.5 last:border-0 lg:grid-cols-[1fr_9rem_9rem_8rem_7rem] lg:items-center lg:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar nama={p.nama} url={p.avatar} ukuran={38} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-ink-800">{p.nama}{p.id === sesi.id && <span className="ml-1.5 text-[11px] font-medium text-brand-600">(Anda)</span>}</p>
                  <p className="truncate text-[11.5px] text-ink-400">{p.email} · {p.telepon}</p>
                </div>
              </div>
              <Lencana className={cn('w-fit ring-1 ring-inset', PERAN.find((r) => r.id === p.peran)?.latar)}>{labelPeran(p.peran)}</Lencana>
              <span className="text-[12.5px] text-ink-600">{izin.size} dari {DAFTAR_IZIN.length} izin</span>
              <span className="text-[12px] text-ink-500">{p.terakhirLogin ? relatifWaktu(p.terakhirLogin) : 'belum pernah'}</span>
              <div className="flex gap-1.5">
                <Tombol varian="tepi" ukuran="kecil" onClick={() => setPilih(p)}>Kelola</Tombol>
                {p.id !== sesi.id && <button onClick={() => setHapus(p)} className="rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
            </div>
          )
        })}
        {daftar.length === 0 && <Kosong judul="Pengguna tidak ditemukan" pesan="Coba kata kunci lain." />}
      </Kartu>

      <Modal buka={!!aktif} onTutup={() => setPilih(null)} judul="Kelola Pengguna & Izin" sub={aktif?.email} lebar="besar">
        {aktif && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Pilih label="Peran" opsi={PERAN.map((r) => ({ nilai: r.id, label: r.label, sub: `${IZIN_BAWAAN[r.id].length} izin bawaan` }))} nilai={aktif.peran} onPilih={(v) => { ubahPeran(aktif.id, v as Peran); tampilkan('Peran diubah', `${aktif.nama} kini ${labelPeran(v as Peran)}`) }} />
              <div className="flex items-end">
                <Sakelar label="Akun aktif" deskripsi="Nonaktifkan untuk memblokir akses masuk" aktif={aktif.aktif} onUbah={(v) => { simpanPengguna({ ...aktif, aktif: v }); tampilkan(v ? 'Akun diaktifkan' : 'Akun dinonaktifkan') }} />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[13.5px] font-semibold text-ink-800">Matriks perizinan</h4>
                <span className="text-[11.5px] text-ink-400">{izinAktif.size}/{DAFTAR_IZIN.length} izin aktif</span>
              </div>
              <div className="max-h-80 space-y-4 overflow-y-auto rounded-2xl border border-ink-100 p-4">
                {grupIzin.map((g) => (
                  <div key={g}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{g}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {DAFTAR_IZIN.filter((i) => i.grup === g).map((i) => {
                        const bawaan = IZIN_BAWAAN[aktif.peran].includes(i.id)
                        const dicabut = aktif.izinDicabut.includes(i.id)
                        const ditambah = aktif.izinTambahan.includes(i.id)
                        const aktifIzin = izinAktif.has(i.id)
                        return (
                          <button
                            key={i.id}
                            onClick={() => { ubahIzin(aktif.id, i.id, !aktifIzin) }}
                            className={cn('flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition', aktifIzin ? 'border-brand-200 bg-brand-50/60' : 'border-ink-200 bg-white hover:border-ink-300')}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[12.5px] font-medium text-ink-800">{i.label}</span>
                              <span className="block text-[10.5px] text-ink-400">
                                {bawaan ? 'bawaan peran' : 'ditambahkan manual'}{dicabut ? ' · dicabut' : ''}{ditambah ? ' · ditambah' : ''}
                              </span>
                            </span>
                            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors', aktifIzin ? 'grad-teal border-transparent' : 'border-ink-300 bg-white')}>
                              {aktifIzin && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Tombol varian="tepi" onClick={() => setPilih(null)}>Tutup</Tombol>
            </div>
          </div>
        )}
      </Modal>

      <Modal buka={tambah} onTutup={() => setTambah(false)} judul="Tambah Pengguna">
        <div className="space-y-4">
          <Masukan label="Nama lengkap" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama pengguna" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Masukan label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@vitacare.id" />
            <Masukan label="Sandi" value={form.sandi} onChange={(e) => setForm({ ...form, sandi: e.target.value })} placeholder="minimal 5 karakter" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Masukan label="Telepon" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="0812xxxxxxx" />
            <Pilih label="Peran" opsi={PERAN.map((r) => ({ nilai: r.id, label: r.label }))} nilai={form.peran} onPilih={(v) => setForm({ ...form, peran: v as Peran })} />
          </div>
          <div className="flex justify-end gap-2">
            <Tombol varian="tepi" onClick={() => setTambah(false)}>Batal</Tombol>
            <Tombol onClick={simpanBaru} ikon="centang">Simpan Pengguna</Tombol>
          </div>
        </div>
      </Modal>

      <ModalKonfirmasi buka={!!hapus} onTutup={() => setHapus(null)} judul="Hapus pengguna?" pesan={`Akun ${hapus?.nama} akan dihapus permanen dari sistem.`} onKonfirmasi={() => { if (hapus) { hapusPengguna(hapus.id); tampilkan('Pengguna dihapus', hapus.nama, 'peringatan') } setHapus(null) }} />
    </AppShell>
  )
}

/* -------------------------------------------------------------- laporan */

type Entitas = 'antrian' | 'janjiTemu' | 'dokter' | 'poli' | 'jadwal' | 'cabang'

export function AdminLaporan() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  const { tampilkan } = gunakanToast()
  const [entitas, setEntitas] = useState<Entitas>('antrian')
  const [dari, setDari] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10) })
  const [sampai, setSampai] = useState(() => new Date().toISOString().slice(0, 10))
  const [kueri, setKueri] = useState('')
  const [tab, setTab] = useState('Pratinjau')

  const bolehEkspor = boleh(sesi, 'ekspor_laporan')

  const baris = useMemo(() => {
    const cari = (s: string) => s.toLowerCase().includes(kueri.toLowerCase())
    if (entitas === 'antrian') {
      return db.antrian
        .filter((a) => a.ambilPada.slice(0, 10) >= dari && a.ambilPada.slice(0, 10) <= sampai)
        .filter((a) => !kueri || cari(a.kode) || cari(a.pasienNama))
        .sort((a, b) => new Date(b.ambilPada).getTime() - new Date(a.ambilPada).getTime())
    }
    if (entitas === 'janjiTemu') return db.janjiTemu.filter((j) => !kueri || cari(j.kode) || cari(j.pasienNama))
    if (entitas === 'dokter') return db.dokter.filter((d) => !kueri || cari(d.nama))
    if (entitas === 'poli') return db.poli.filter((p) => !kueri || cari(p.nama))
    if (entitas === 'jadwal') return db.jadwal.filter((j) => !kueri || cari(db.dokter.find((d) => d.id === j.dokterId)?.nama ?? ''))
    return db.cabang.filter((c) => !kueri || cari(c.nama))
  }, [entitas, db, dari, sampai, kueri])

  const ringkas = useMemo(() => {
    if (entitas !== 'antrian') return null
    const daftar = baris as typeof db.antrian
    const tunggu = daftar.filter((a) => a.dipanggilPada).map((a) => Math.round((new Date(a.dipanggilPada!).getTime() - new Date(a.ambilPada).getTime()) / 60000))
    return {
      total: daftar.length,
      selesai: daftar.filter((a) => a.status === 'selesai').length,
      batal: daftar.filter((a) => a.status === 'batal').length,
      rata: tunggu.length ? Math.round(tunggu.reduce((s, v) => s + v, 0) / tunggu.length) : 0,
    }
  }, [baris, entitas])

  const kolomBaris = (): { kolom: string[]; data: Array<Array<string | number>> } => {
    if (entitas === 'antrian') {
      const d = baris as typeof db.antrian
      return {
        kolom: ['Kode', 'Nama', 'Telepon', 'Poli', 'Dokter', 'Cabang', 'Prioritas', 'Status', 'Tanggal', 'Ambil', 'Panggil', 'Selesai', 'Tunggu (mnt)'],
        data: d.map((a) => [a.kode, a.pasienNama, a.telepon, db.poli.find((p) => p.id === a.poliId)?.nama ?? '', db.dokter.find((x) => x.id === a.dokterId)?.nama ?? '', db.cabang.find((c) => c.id === a.cabangId)?.nama ?? '', a.prioritas, a.status, a.ambilPada.slice(0, 10), a.ambilPada.slice(11, 16), a.dipanggilPada?.slice(11, 16) ?? '-', a.selesaiPada?.slice(11, 16) ?? '-', a.dipanggilPada ? Math.round((new Date(a.dipanggilPada).getTime() - new Date(a.ambilPada).getTime()) / 60000) : '-']),
      }
    }
    if (entitas === 'janjiTemu') {
      const d = baris as typeof db.janjiTemu
      return { kolom: ['Kode', 'Pasien', 'Dokter', 'Poli', 'Tanggal', 'Jam', 'Status', 'Alasan'], data: d.map((j) => [j.kode, j.pasienNama, db.dokter.find((x) => x.id === j.dokterId)?.nama ?? '', db.poli.find((p) => p.id === j.poliId)?.nama ?? '', j.tanggal, j.jam, j.status, j.alasan]) }
    }
    if (entitas === 'dokter') {
      const d = baris as typeof db.dokter
      return { kolom: ['Nama', 'Spesialis', 'Poli', 'SIP', 'Telepon', 'Rating'], data: d.map((x) => [x.nama, x.spesialis, db.poli.find((p) => p.id === x.poliId)?.nama ?? '', x.sip, x.telepon, x.rating]) }
    }
    if (entitas === 'poli') {
      const d = baris as typeof db.poli
      return { kolom: ['Kode', 'Nama', 'Ruang', 'Lantai', 'Rata layan', 'Cabang'], data: d.map((p) => [p.kode, p.nama, p.ruang, p.lantai, p.rataLayanan, p.cabangIds.length]) }
    }
    if (entitas === 'jadwal') {
      const d = baris as typeof db.jadwal
      return { kolom: ['Dokter', 'Hari', 'Mulai', 'Selesai', 'Kuota', 'Cabang'], data: d.map((j) => [db.dokter.find((x) => x.id === j.dokterId)?.nama ?? '', j.hari, j.mulai, j.selesai, j.kuota, db.cabang.find((c) => c.id === j.cabangId)?.nama ?? '']) }
    }
    const d = baris as typeof db.cabang
    return { kolom: ['Kode', 'Nama', 'Kota', 'Alamat', 'Telepon'], data: d.map((c) => [c.kode, c.nama, c.kota, c.alamat, c.telepon]) }
  }

  const eksporCSV = () => {
    if (!bolehEkspor) return tampilkan('Izin ditolak', 'Peran Anda tidak memiliki izin ekspor laporan.', 'galat')
    const { kolom, data } = kolomBaris()
    unduhBerkas(`laporan-${entitas}-${dari}_${sampai}.csv`, keCSV(kolom, data), 'text/csv')
    tampilkan('Laporan diekspor', `${data.length} baris → CSV`)
  }

  const eksporJSON = () => {
    if (!bolehEkspor) return tampilkan('Izin ditolak', 'Peran Anda tidak memiliki izin ekspor laporan.', 'galat')
    const { kolom, data } = kolomBaris()
    const json = JSON.stringify({ dibuatPada: new Date().toISOString(), rentang: { dari, sampai }, entitas, kolom, baris: data }, null, 2)
    unduhBerkas(`laporan-${entitas}.json`, json, 'application/json')
    tampilkan('Laporan diekspor', `${data.length} baris → JSON`)
  }

  const { kolom, data } = kolomBaris()

  return (
    <AppShell
      judul="Laporan & Ekspor" sub={`${data.length} baris pada rentang terpilih`}
      aksi={
        <>
          <Masukan type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="h-9 w-40 text-[12.5px]" />
          <Masukan type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="h-9 w-40 text-[12.5px]" />
          <Tombol varian="tepi" ukuran="kecil" onClick={() => window.print()} ikonKanan={<Printer size={13} />}>Cetak</Tombol>
          <Tombol varian="tepi" ukuran="kecil" onClick={eksporJSON} ikonKanan={<Download size={13} />}>JSON</Tombol>
          <Tombol ukuran="kecil" onClick={eksporCSV} ikonKanan={<Download size={13} />}>Ekspor CSV</Tombol>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-80"><Tab tab={['Pratinjau', 'Rekap']} aktif={tab} onPilih={setTab} /></div>
        <div className="w-full sm:w-56"><Pilih kecil opsi={[{ nilai: 'antrian', label: 'Antrian' }, { nilai: 'janjiTemu', label: 'Janji Temu' }, { nilai: 'dokter', label: 'Dokter' }, { nilai: 'poli', label: 'Poli' }, { nilai: 'jadwal', label: 'Jadwal' }, { nilai: 'cabang', label: 'Cabang' }]} nilai={entitas} onPilih={(v) => setEntitas(v as Entitas)} /></div>
        <input value={kueri} onChange={(e) => setKueri(e.target.value)} placeholder="Filter kata kunci…" className="h-9 flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-[13px] sm:max-w-xs" />
      </div>

      {!bolehEkspor && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[12.5px] text-amber-800">
          Peran Anda dapat melihat pratinjau laporan, tetapi tidak memiliki izin <span className="font-semibold">ekspor_laporan</span>.
        </div>
      )}

      {tab === 'Pratinjau' ? (
        <Kartu className="cetak-penuh overflow-hidden">
          <div className="max-h-[36rem] overflow-auto">
            <table className="w-full min-w-[52rem] text-left text-[12.5px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-ink-100 text-[10.5px] uppercase tracking-wide text-ink-400">
                  {kolom.map((k) => <th key={k} className="whitespace-nowrap px-4 py-3 font-semibold">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 200).map((b, i) => (
                  <tr key={i} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50">
                    {b.map((v, j) => <td key={j} className="whitespace-nowrap px-4 py-2.5 text-ink-700">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && <Kosong judul="Tidak ada data" pesan="Ubah rentang tanggal atau kata kunci." />}
          </div>
          {data.length > 200 && <p className="border-t border-ink-100 px-5 py-3 text-[11.5px] text-ink-400">Menampilkan 200 dari {data.length} baris. Ekspor CSV untuk data lengkap.</p>}
        </Kartu>
      ) : (
        <div className="space-y-5">
          {ringkas && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KartuSorotan judul="Total kunjungan" nilai={<AngkaAnimasi nilai={ringkas.total} />} sub={`${tanggalPendek(dari)} – ${tanggalPendek(sampai)}`} ikon="daftar" warna="#0c8672" />
              <KartuSorotan judul="Selesai" nilai={<AngkaAnimasi nilai={ringkas.selesai} />} ikon="centang" warna="#3b82f6" />
              <KartuSorotan judul="Batal" nilai={<AngkaAnimasi nilai={ringkas.batal} />} ikon="peringatan" warna="#f43f5e" />
              <KartuSorotan judul="Rata-rata tunggu" nilai={<><AngkaAnimasi nilai={ringkas.rata} /><span className="text-sm font-medium text-ink-400"> mnt</span></>} ikon="jam" warna="#d97706" />
            </div>
          )}
          <Kartu className="p-6">
            <h3 className="text-[15px] font-semibold text-ink-900">Ringkasan entitas</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { k: 'Total antrian tercatat', v: db.antrian.length },
                { k: 'Janji temu', v: db.janjiTemu.length },
                { k: 'Dokter aktif', v: db.dokter.filter((d) => d.aktif).length },
                { k: 'Poli aktif', v: db.poli.filter((p) => p.aktif).length },
                { k: 'Slot jadwal', v: db.jadwal.length },
                { k: 'Cabang', v: db.cabang.length },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
                  <p className="text-[11.5px] uppercase tracking-wide text-ink-400">{x.k}</p>
                  <p className="mt-1 text-xl font-semibold text-ink-900"><AngkaAnimasi nilai={x.v} /></p>
                </div>
              ))}
            </div>
          </Kartu>
        </div>
      )}
    </AppShell>
  )
}

/* ------------------------------------------------------------ audit log */

export function AdminAudit() {
  const db = pakaiDB()
  const { tampilkan } = gunakanToast()
  const [kueri, setKueri] = useState('')
  const [aktor, setAktor] = useState('')
  const [aksi, setAksi] = useState('')

  const daftarAktor = Array.from(new Set(db.audit.map((a) => a.aktorNama)))
  const daftarAksi = Array.from(new Set(db.audit.map((a) => a.aksi)))

  const daftar = db.audit
    .filter((a) => !aktor || a.aktorNama === aktor)
    .filter((a) => !aksi || a.aksi === aksi)
    .filter((a) => !kueri || (a.aktorNama + a.aksi + a.detail + a.entitas).toLowerCase().includes(kueri.toLowerCase()))
    .slice(0, 300)

  const ekspor = () => {
    unduhBerkas('audit-log.csv', keCSV(['Waktu', 'Aktor', 'Peran', 'Aksi', 'Entitas', 'Detail', 'IP'], daftar.map((a) => [new Date(a.waktu).toISOString(), a.aktorNama, a.aktorPeran, a.aksi, a.entitas, a.detail, a.ip])), 'text/csv')
    tampilkan('Audit log diekspor', `${daftar.length} entri.`)
  }

  const warnaAksi: Record<string, string> = {
    MASUK: 'bg-blue-100 text-blue-700 ring-blue-200', KELUAR: 'bg-ink-100 text-ink-600 ring-ink-200',
    PANGGIL_ANTRIAN: 'bg-brand-100 text-brand-700 ring-brand-200', AMBIL_NOMOR: 'bg-violet-100 text-violet-700 ring-violet-200',
    HAPUS_POLI: 'bg-rose-100 text-rose-700 ring-rose-200', HAPUS_DOKTER: 'bg-rose-100 text-rose-700 ring-rose-200',
    UBAH_IZIN: 'bg-amber-100 text-amber-800 ring-amber-200', UBAH_PERAN: 'bg-amber-100 text-amber-800 ring-amber-200',
  }

  return (
    <AppShell
      judul="Audit Log" sub={`${db.audit.length} aktivitas tercatat`}
      aksi={
        <>
          <input value={kueri} onChange={(e) => setKueri(e.target.value)} placeholder="Cari aktivitas…" className="h-9 flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-[13px] sm:max-w-xs" />
          <div className="w-44"><Pilih kecil opsi={[{ nilai: '', label: 'Semua aktor' }, ...daftarAktor.map((a) => ({ nilai: a, label: a }))]} nilai={aktor} onPilih={setAktor} /></div>
          <div className="w-44"><Pilih kecil opsi={[{ nilai: '', label: 'Semua aksi' }, ...daftarAksi.map((a) => ({ nilai: a, label: a }))]} nilai={aksi} onPilih={setAksi} carian /></div>
          <Tombol varian="tepi" ukuran="kecil" onClick={ekspor} ikonKanan={<Download size={13} />}>Ekspor</Tombol>
        </>
      }
    >
      <Kartu className="overflow-hidden">
        {daftar.map((a) => (
          <div key={a.id} className="flex gap-4 border-b border-ink-50 px-5 py-3.5 last:border-0 hover:bg-ink-50/40">
            <div className="hidden w-36 shrink-0 pt-0.5 text-[11.5px] tabular-nums text-ink-400 sm:block">
              {new Date(a.waktu).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
              <span className="block text-ink-300">{new Date(a.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Lencana className={cn('ring-1 ring-inset', warnaAksi[a.aksi] ?? 'bg-ink-100 text-ink-600 ring-ink-200')}>{a.aksi}</Lencana>
                <span className="text-[13px] font-semibold text-ink-800">{a.aktorNama}</span>
                <span className="text-[11.5px] text-ink-400">· {labelPeran(a.aktorPeran)}</span>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">{a.detail}</p>
              <p className="mt-1 text-[11px] text-ink-300">{a.entitas} · IP {a.ip}</p>
            </div>
          </div>
        ))}
        {daftar.length === 0 && <Kosong ikon="audit" judul="Tidak ada aktivitas" pesan="Ubah filter untuk melihat aktivitas lain." />}
      </Kartu>
    </AppShell>
  )
}

/* ---------------------------------------------------------- pengaturan */

export function AdminPengaturan() {
  const db = pakaiDB()
  const sesi = pakaiPenggunaSesi()!
  const { tampilkan } = gunakanToast()
  const [reset, setReset] = useState(false)
  const p = db.pengaturan

  const mintaIzinBrowser = () => {
    if (typeof Notification === 'undefined') return tampilkan('Tidak didukung', 'Peramban ini tidak mendukung notifikasi.', 'galat')
    Notification.requestPermission().then((hasil) => {
      simpanPengaturan({ notifikasiBrowser: hasil === 'granted' })
      tampilkan(hasil === 'granted' ? 'Notifikasi diaktifkan' : 'Izin ditolak', hasil === 'granted' ? 'Push notification aktif pada perangkat ini.' : 'Peramban menolak izin notifikasi.', hasil === 'granted' ? 'sukses' : 'peringatan')
    })
  }

  return (
    <AppShell judul="Pengaturan Sistem" sub="Konfigurasi global VitaCare">
      <div className="grid gap-6 lg:grid-cols-2">
        <Kartu className="p-6">
          <h3 className="text-[15px] font-semibold text-ink-900">Identitas & jam layanan</h3>
          <div className="mt-5 space-y-4">
            <Masukan label="Nama rumah sakit" value={p.namaRs} onChange={(e) => simpanPengaturan({ namaRs: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Masukan label="Jam buka" type="time" value={p.jamBuka} onChange={(e) => simpanPengaturan({ jamBuka: e.target.value })} />
              <Masukan label="Jam tutup" type="time" value={p.jamTutup} onChange={(e) => simpanPengaturan({ jamTutup: e.target.value })} />
            </div>
          </div>
        </Kartu>

        <Kartu className="p-6">
          <h3 className="text-[15px] font-semibold text-ink-900">Layanan & notifikasi</h3>
          <div className="mt-5 space-y-5">
            <Sakelar label="Suara pemanggilan" deskripsi="Bunyi & pengumuman suara saat nomor dipanggil" aktif={p.suaraPanggilan} onUbah={(v) => { simpanPengaturan({ suaraPanggilan: v }); tampilkan(v ? 'Suara diaktifkan' : 'Suara dimatikan') }} />
            <Sakelar label="Push notification peramban" deskripsi="Tampilkan notifikasi sistem di luar tab" aktif={p.notifikasiBrowser} onUbah={(v) => (v ? mintaIzinBrowser() : simpanPengaturan({ notifikasiBrowser: false }))} />
            <Sakelar label="Mode simulasi realtime" deskripsi="Pasien walk-in & pemanggilan otomatis untuk demonstrasi" aktif={p.modeSimulasi} onUbah={(v) => { simpanPengaturan({ modeSimulasi: v }); tampilkan(v ? 'Simulasi diaktifkan' : 'Simulasi dihentikan') }} />
            <div>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="font-medium text-ink-700">Selisih pemanggilan antar poli</span>
                <span className="font-semibold text-brand-700">{p.selisihPanggilan} menit</span>
              </div>
              <input type="range" min={1} max={15} value={p.selisihPanggilan} onChange={(e) => simpanPengaturan({ selisihPanggilan: Number(e.target.value) })} className="w-full accent-brand-600" />
            </div>
          </div>
        </Kartu>

        <Kartu className="p-6">
          <h3 className="text-[15px] font-semibold text-ink-900">Ringkasan penyimpanan</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            {[
              { k: 'Antrian', v: db.antrian.length }, { k: 'Pengguna', v: db.pengguna.length },
              { k: 'Dokter', v: db.dokter.length }, { k: 'Audit log', v: db.audit.length },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl bg-ink-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-ink-400">{x.k}</p>
                <p className="mt-1 text-lg font-semibold text-ink-900"><AngkaAnimasi nilai={x.v} /></p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-ink-500">
            Seluruh data tersimpan di PostgreSQL (<span className="font-mono text-[11px]">vitacare-api</span>) dan
            disinkronkan ke seluruh perangkat setiap beberapa detik. Realtime instan (WebSocket) menyusul di fase berikutnya.
          </p>
        </Kartu>

        <Kartu className="border-rose-200 p-6">
          <h3 className="text-[15px] font-semibold text-rose-700">Zona berbahaya</h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
            Mengembalikan seluruh data ke kondisi awal pabrik: poli, dokter, jadwal, antrian, dan pengguna demo.
            Tindakan ini tercatat pada audit log.
          </p>
          <div className="mt-5">
            <Tombol varian="bahaya" onClick={() => setReset(true)} ikonKanan={<RotateCcw size={14} />} disabled={!boleh(sesi, 'ubah_pengaturan')}>Reset Sistem</Tombol>
          </div>
        </Kartu>
      </div>

      <ModalKonfirmasi
        buka={reset} onTutup={() => setReset(false)}
        judul="Reset seluruh sistem?"
        pesan="Semua perubahan lokal akan hilang dan data kembali ke set awal. Lanjutkan?"
        onKonfirmasi={() => { resetSistem(); setReset(false); tampilkan('Sistem direset', 'Data kembali ke kondisi awal.', 'peringatan') }}
      />
    </AppShell>
  )
}
