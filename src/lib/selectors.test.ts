import { describe, expect, it } from 'vitest'
import { antreanPoli, antrianAktif, urutAntrian } from './selectors'
import type { Antrian, DB } from './types'

function buatAntrian(over: Partial<Antrian>): Antrian {
  return {
    id: over.id ?? 'a1',
    kode: 'UMU-01',
    nomor: 1,
    poliId: 'poli_umu',
    dokterId: 'dok_1',
    cabangId: 'cbg_jkt',
    pasienId: '',
    pasienNama: 'Tes',
    telepon: '0800',
    alasan: 'tes',
    prioritas: 'reguler',
    status: 'menunggu',
    ambilPada: '2026-01-01T00:00:00.000Z',
    estimasiAwal: 5,
    ...over,
  }
}

describe('urutAntrian', () => {
  it('darurat selalu di depan reguler walau diambil belakangan', () => {
    const reguler = buatAntrian({ id: 'r', prioritas: 'reguler', ambilPada: '2026-01-01T00:00:00.000Z' })
    const darurat = buatAntrian({ id: 'd', prioritas: 'darurat', ambilPada: '2026-01-01T00:10:00.000Z' })
    expect([reguler, darurat].sort(urutAntrian).map((a) => a.id)).toEqual(['d', 'r'])
  })

  it('prioritas sama -> yang diambil lebih dulu menang (FIFO)', () => {
    const belakangan = buatAntrian({ id: 'b', ambilPada: '2026-01-01T00:10:00.000Z' })
    const duluan = buatAntrian({ id: 'a', ambilPada: '2026-01-01T00:00:00.000Z' })
    expect([belakangan, duluan].sort(urutAntrian).map((a) => a.id)).toEqual(['a', 'b'])
  })

  it('urutan bobot penuh: darurat < hamil < difabel < lansia < reguler', () => {
    const acak = (['reguler', 'lansia', 'difabel', 'hamil', 'darurat'] as const).map((prioritas, i) =>
      buatAntrian({ id: prioritas, prioritas, ambilPada: `2026-01-01T00:0${i}:00.000Z` }),
    )
    expect(acak.sort(urutAntrian).map((a) => a.id)).toEqual(['darurat', 'hamil', 'difabel', 'lansia', 'reguler'])
  })
})

describe('antrianAktif & antreanPoli', () => {
  const db: DB = {
    versi: 3,
    cabang: [], poli: [], dokter: [], jadwal: [], janjiTemu: [], pengguna: [], notifikasi: [], audit: [],
    pengaturan: { namaRs: '', jamBuka: '', jamTutup: '', suaraPanggilan: false, notifikasiBrowser: false, modeSimulasi: false, selisihPanggilan: 0 },
    antrian: [
      buatAntrian({ id: '1', status: 'menunggu', cabangId: 'cbg_jkt' }),
      buatAntrian({ id: '2', status: 'selesai', cabangId: 'cbg_jkt' }),
      buatAntrian({ id: '3', status: 'batal', cabangId: 'cbg_jkt' }),
      buatAntrian({ id: '4', status: 'dipanggil', cabangId: 'cbg_bdg' }),
      buatAntrian({ id: '5', status: 'menunggu', poliId: 'poli_ank', cabangId: 'cbg_jkt' }),
    ],
  }

  it('antrianAktif membuang status selesai & batal', () => {
    expect(antrianAktif(db).map((a) => a.id).sort()).toEqual(['1', '4', '5'])
  })

  it('antrianAktif bisa difilter per cabang', () => {
    expect(antrianAktif(db, 'cbg_bdg').map((a) => a.id)).toEqual(['4'])
  })

  it('antreanPoli memfilter poli sekaligus cabang', () => {
    expect(antreanPoli(db, 'poli_ank', 'cbg_jkt').map((a) => a.id)).toEqual(['5'])
    expect(antreanPoli(db, 'poli_ank', 'cbg_bdg')).toEqual([])
  })
})
