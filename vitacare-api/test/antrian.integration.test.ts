/**
 * Test integrasi jalan lewat app Express asli (bukan mock) ke database dev
 * yang sama dipakai `npm run dev` — proyek ini belum punya DB test terpisah
 * (ponytail: kalau tim tumbuh, pindahkan ke database per-run/testcontainers).
 * Setiap baris yang dibuat test dihapus lagi di akhir supaya data kerja
 * sehari-hari tetap bersih.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

const CABANG_ID = 'cbg_jkt'

let tokenAdmin: string
const idDibuat: string[] = []

beforeAll(async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@vitacare.id', sandi: 'admin123' })
  if (res.status !== 200) throw new Error('Login admin gagal — pastikan `npm run seed` sudah dijalankan di DB ini.')
  tokenAdmin = res.body.token
})

afterAll(async () => {
  if (idDibuat.length) await prisma.antrian.deleteMany({ where: { id: { in: idDibuat } } })
})

async function ambilNomor(poliId: string, prioritas: string, nama: string) {
  const res = await request(app)
    .post('/api/antrian')
    .send({ poliId, cabangId: CABANG_ID, nama, telepon: '0800-0000-0000', alasan: 'Test otomatis', prioritas })
  expect(res.status, `ambil nomor gagal: ${JSON.stringify(res.body)}`).toBe(201)
  idDibuat.push(res.body.id)
  return res.body as { id: string; kode: string; prioritas: string }
}

describe('POST /api/antrian — race condition', () => {
  it('tidak pernah menghasilkan kode duplikat saat banyak loket input bersamaan', async () => {
    const hasil = await Promise.all(Array.from({ length: 8 }, (_, i) => ambilNomor('poli_umu', 'reguler', `Uji Konkuren ${i}`)))
    const kodeUnik = new Set(hasil.map((a) => a.kode))
    expect(kodeUnik.size).toBe(hasil.length)
  })
})

describe('POST /api/antrian/panggil-berikutnya — urutan prioritas', () => {
  it('memanggil darurat lebih dulu meski diambil paling akhir', async () => {
    // poli tersendiri (poli_ank) supaya tidak berebut antrean dengan test race-condition di atas
    const reguler = await ambilNomor('poli_ank', 'reguler', 'Uji Reguler')
    const lansia = await ambilNomor('poli_ank', 'lansia', 'Uji Lansia')
    const darurat = await ambilNomor('poli_ank', 'darurat', 'Uji Darurat')

    const urutanDipanggil: string[] = []
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/antrian/panggil-berikutnya')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ poliId: 'poli_ank', cabangId: CABANG_ID })
      urutanDipanggil.push(res.body.id)
    }

    expect(urutanDipanggil).toEqual([darurat.id, lansia.id, reguler.id])
  })
})

describe('POST /api/antrian/panggil-berikutnya — tanpa izin', () => {
  it('ditolak 401 tanpa token', async () => {
    const res = await request(app).post('/api/antrian/panggil-berikutnya').send({ poliId: 'poli_ank', cabangId: CABANG_ID })
    expect(res.status).toBe(401)
  })
})
