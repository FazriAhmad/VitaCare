import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell, KartuSorotan, tampilkanCabang } from '../components/AppShell'
import { AngkaAnimasi, GrafikArea, GrafikBatang, GrafikDonat, PetaPanas, Progres } from '../components/charts'
import { Kartu, Pilih, Tab } from '../components/ui'
import { Ikon } from '../components/Icon'
import {
  bebanPerJam, distribusiPrioritas, distribusiStatus, kpi, kunjunganHarian, kunjunganPerPoli,
  performaDokter, prediksiTunggu, ringkasanCabang, trenTunggu,
} from '../lib/analytics'
import { antreanPoli, pakaiDB, urutAntrian } from '../lib/db'
import { cn, jam } from '../lib/utils'

export function AdminBeranda() {
  const db = pakaiDB()
  const [cabangId, setCabangId] = useState('')
  const [tab, setTab] = useState('Kunjungan')
  const filter = cabangId || tampilkanCabang()

  const statistik = kpi(db, filter)
  const deret = kunjunganHarian(db, 14, filter)
  const tren = trenTunggu(db, 14, filter)
  const perPoli = kunjunganPerPoli(db, filter)
  const perJam = bebanPerJam(db, 14, filter)
  const dokter = performaDokter(db, filter).slice(0, 6)
  const cabang = ringkasanCabang(db)
  const prioritas = distribusiPrioritas(db, filter)
  const status = distribusiStatus(db, filter)
  const antreAktif = db.antrian.filter((a) => a.cabangId === filter && (a.status === 'menunggu' || a.status === 'dipanggil' || a.status === 'dilayani')).sort(urutAntrian)

  return (
    <AppShell
      judul="Dasbor Analitik" sub="Ringkasan operasional seluruh layanan"
      aksi={<Pilih kecil opsi={[{ nilai: '', label: 'Seluruh cabang' }, ...db.cabang.map((c) => ({ nilai: c.id, label: c.nama, warna: c.warna }))]} nilai={cabangId} onPilih={setCabangId} />}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KartuSorotan judul="Kunjungan hari ini" nilai={<AngkaAnimasi nilai={statistik.hariIni} />} sub={`${statistik.dibandingKemarin >= 0 ? '+' : ''}${statistik.dibandingKemarin}% dibanding kemarin`} ikon="daftar" warna="#0c8672" />
          <KartuSorotan judul="Menunggu & dilayani" nilai={<AngkaAnimasi nilai={statistik.menunggu + statistik.dilayani} />} sub={`${statistik.menunggu} menunggu`} ikon="jam" warna="#3b82f6" />
          <KartuSorotan judul="Rata-rata tunggu" nilai={<><AngkaAnimasi nilai={statistik.rataTunggu} /><span className="text-sm font-medium text-ink-400"> mnt</span></>} sub={`layanan ${statistik.rataLayan} menit`} ikon="grafik" warna="#d97706" />
          <KartuSorotan judul="Tingkat penyelesaian" nilai={<><AngkaAnimasi nilai={statistik.tingkatSelesai} /><span className="text-sm font-medium text-ink-400">%</span></>} sub={`${statistik.batal} pasien batal`} ikon="centang" warna="#8b5cf6" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Kartu className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-ink-900">Tren 14 hari</h3>
                <p className="text-[12px] text-ink-400">Perbandingan kunjungan dan waktu tunggu</p>
              </div>
              <div className="w-56"><Tab tab={['Kunjungan', 'Waktu Tunggu']} aktif={tab} onPilih={setTab} /></div>
            </div>
            {tab === 'Kunjungan' ? (
              <GrafikArea data={deret.map((d) => ({ label: d.tanggal.slice(8) + '/' + d.tanggal.slice(5, 7), nilai: d.total }))} tinggi={210} />
            ) : (
              <GrafikArea data={tren.map((d) => ({ label: d.tanggal.slice(8) + '/' + d.tanggal.slice(5, 7), nilai: d.total }))} tinggi={210} warna="#d97706" warna2="#f59e0b" />
            )}
          </Kartu>

          <Kartu className="p-6">
            <h3 className="mb-5 text-[15px] font-semibold text-ink-900">Distribusi status antrian</h3>
            <GrafikDonat data={status} ukuran={164} tebal={18} pusatBawah="antrian" />
            <div className="mt-6 border-t border-ink-100 pt-5">
              <h4 className="mb-3 text-[13px] font-semibold text-ink-700">Komposisi prioritas hari ini</h4>
              <div className="space-y-2.5">
                {prioritas.map((p) => {
                  const maks = Math.max(...prioritas.map((x) => x.nilai), 1)
                  return (
                    <div key={p.label} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-[11.5px] text-ink-500">{p.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <Progres nilai={p.nilai} maks={maks} />
                      </div>
                      <span className="w-7 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-700">{p.nilai}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Kartu>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Kartu className="p-6">
            <h3 className="mb-1 text-[15px] font-semibold text-ink-900">Kunjungan per poli</h3>
            <p className="mb-5 text-[12px] text-ink-400">Akumulasi 30 hari terakhir</p>
            <GrafikBatang data={perPoli.map((p) => ({ label: p.poli.kode, nilai: p.kunjungan }))} warna="#0c8672" />
          </Kartu>

          <Kartu className="p-6">
            <h3 className="mb-1 text-[15px] font-semibold text-ink-900">Beban antre per jam</h3>
            <p className="mb-5 text-[12px] text-ink-400">Intensitas kedatangan 14 hari terakhir</p>
            <PetaPanas data={perJam} />
            <div className="mt-5 flex flex-wrap gap-3 text-[11.5px] text-ink-400">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: 'rgba(12,134,114,0.2)' }} /> sepi</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: 'rgba(12,134,114,0.6)' }} /> ramai</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: 'rgba(12,134,114,0.95)' }} /> puncak</span>
            </div>
          </Kartu>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Kartu className="overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink-900">Performa antrean per poli</h3>
            </div>
            <div className="max-h-[24rem] overflow-y-auto">
              {perPoli.filter((p) => p.kunjungan > 0).map((p) => (
                <div key={p.poli.id} className="flex items-center gap-3 border-b border-ink-50 px-5 py-3.5 last:border-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${p.poli.warna}18` }}>
                    <Ikon nama={p.poli.ikon} ukuran={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{p.poli.nama}</p>
                    <p className="text-[11.5px] text-ink-400">{p.kunjungan} kunjungan · {p.menunggu} menunggu</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12.5px] font-semibold text-ink-800">{p.rataTunggu} mnt</p>
                    <p className="text-[10.5px] text-ink-400">tunggu · layan {p.rataLayan}</p>
                  </div>
                </div>
              ))}
            </div>
          </Kartu>

          <Kartu className="overflow-hidden">
            <div className="border-b border-ink-100 px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink-900">Peringkat dokter</h3>
            </div>
            <div className="max-h-[24rem] overflow-y-auto">
              {dokter.map((d, i) => (
                <div key={d.dokter.id} className="flex items-center gap-3 border-b border-ink-50 px-5 py-3.5 last:border-0">
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold', i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-ink-100 text-ink-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-ink-50 text-ink-400')}>
                    {i + 1}
                  </span>
                  <img src={d.dokter.foto} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-800">{d.dokter.nama.split(',')[0]}</p>
                    <p className="truncate text-[11.5px] text-ink-400">{d.dokter.spesialis}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12.5px] font-semibold text-ink-800">{d.kunjungan} pasien</p>
                    <p className="text-[10.5px] text-ink-400">rata {d.rataLayan} mnt layan</p>
                  </div>
                </div>
              ))}
              {dokter.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-ink-400">Belum ada data pelayanan.</p>}
            </div>
          </Kartu>
        </div>

        <Kartu className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <h3 className="text-[15px] font-semibold text-ink-900">Perbandingan multi cabang</h3>
            <Link to="/admin/cabang" className="text-[12.5px] font-semibold text-brand-700 hover:text-brand-800">Kelola cabang →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-100 text-[11px] uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-3 font-semibold">Cabang</th>
                  <th className="px-5 py-3 font-semibold">Kota</th>
                  <th className="px-5 py-3 font-semibold">Poli</th>
                  <th className="px-5 py-3 font-semibold">Dokter</th>
                  <th className="px-5 py-3 font-semibold">Hari ini</th>
                  <th className="px-5 py-3 font-semibold">Menunggu</th>
                  <th className="px-5 py-3 font-semibold">Selesai</th>
                  <th className="px-5 py-3 font-semibold">Rata tunggu</th>
                </tr>
              </thead>
              <tbody>
                {cabang.map((c) => (
                  <tr key={c.cabang.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/50">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <span className="h-8 w-1.5 rounded-full" style={{ background: c.cabang.warna }} />
                        <span>
                          <span className="block font-semibold text-ink-800">{c.cabang.nama}</span>
                          <span className="block text-[11px] text-ink-400">{c.cabang.kode}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-600">{c.cabang.kota}</td>
                    <td className="px-5 py-3.5 text-ink-600">{c.poli}</td>
                    <td className="px-5 py-3.5 text-ink-600">{c.dokter}</td>
                    <td className="px-5 py-3.5 font-semibold text-ink-800">{c.hariIni}</td>
                    <td className="px-5 py-3.5 text-ink-600">{c.menunggu}</td>
                    <td className="px-5 py-3.5 text-brand-700">{c.selesai}</td>
                    <td className="px-5 py-3.5 text-ink-600">{c.rataTunggu} mnt</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>

        <Kartu className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-ink-900">Model prediksi waktu tunggu</h3>
              <p className="mt-1 text-[12.5px] text-ink-500">Perhitungan berjalan langsung pada antrean aktif cabang terpilih.</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-[11.5px] font-semibold text-brand-700">aktif</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {antreAktif.slice(0, 6).map((a) => {
              const pr = prediksiTunggu(db, a)
              return (
                <div key={a.id} className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="nomor-antrian text-[14px] font-bold text-ink-900">{a.kode}</span>
                    <span className="text-[11.5px] text-ink-400">{jam(a.ambilPada)}</span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-ink-500">{a.pasienNama}</p>
                  <p className="mt-2.5 text-[19px] font-semibold text-brand-700">{pr.estimasi} <span className="text-[12px] font-medium text-ink-400">menit</span></p>
                  <Progres className="mt-2" nilai={pr.keyakinan} />
                  <p className="mt-1.5 text-[10.5px] text-ink-400">keyakinan {pr.keyakinan}% · {pr.antrianDepan} di depan</p>
                </div>
              )
            })}
            {antreAktif.length === 0 && <p className="text-[13px] text-ink-400">Tidak ada antrean aktif pada cabang ini.</p>}
          </div>
        </Kartu>
      </div>
    </AppShell>
  )
}

export { antreanPoli }
