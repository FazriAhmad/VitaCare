import { afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

const idDibuat: string[] = []
afterAll(async () => {
  if (idDibuat.length) await prisma.pengguna.deleteMany({ where: { id: { in: idDibuat } } })
})

function pendaftaranBaru(over: Record<string, unknown> = {}) {
  const acak = Math.random().toString(36).slice(2, 8)
  return {
    nama: 'Uji Privasi', email: `uji.privasi.${acak}@mail.id`, sandi: 'rahasia123',
    telepon: '0812-9999-0000', nik: '3175019901010099', cabangId: 'cbg_jkt', setuju: true,
    ...over,
  }
}

describe('POST /api/auth/register — consent', () => {
  it('ditolak tanpa setuju:true', async () => {
    const res = await request(app).post('/api/auth/register').send(pendaftaranBaru({ setuju: false }))
    expect(res.status).toBe(400)
  })

  it('berhasil dengan setuju:true dan mencatat persetujuanPada', async () => {
    const res = await request(app).post('/api/auth/register').send(pendaftaranBaru())
    expect(res.status).toBe(201)
    idDibuat.push(res.body.pengguna.id)
    expect(res.body.pengguna.persetujuanPada).toBeTruthy()
  })
})

describe('Enkripsi at-rest NIK & telepon', () => {
  it('tersimpan di database sebagai ciphertext, bukan teks polos', async () => {
    const res = await request(app).post('/api/auth/register').send(pendaftaranBaru())
    idDibuat.push(res.body.pengguna.id)

    const [baris] = await prisma.$queryRaw<Array<{ nik: string; telepon: string }>>`
      SELECT nik, telepon FROM "Pengguna" WHERE id = ${res.body.pengguna.id}
    `
    expect(baris.nik.startsWith('v1:')).toBe(true)
    expect(baris.telepon.startsWith('v1:')).toBe(true)

    // tapi lewat API (extension mendekripsi otomatis) harus kembali ke nilai asli
    expect(res.body.pengguna.nik).toBe('3175019901010099')
    expect(res.body.pengguna.telepon).toBe('0812-9999-0000')
  })
})

describe('Hak pasien: ekspor & hapus data', () => {
  it('ekspor mengembalikan profil tanpa passwordHash', async () => {
    const daftar = await request(app).post('/api/auth/register').send(pendaftaranBaru())
    idDibuat.push(daftar.body.pengguna.id)

    const res = await request(app).get('/api/privasi/ekspor').set('Authorization', `Bearer ${daftar.body.token}`)
    expect(res.status).toBe(200)
    expect(res.body.profil.passwordHash).toBeUndefined()
    expect(res.body.profil.nik).toBe('3175019901010099')
    expect(Array.isArray(res.body.antrian)).toBe(true)
  })

  it('hapus menganonimkan akun dan mencabut akses login', async () => {
    const daftar = await request(app).post('/api/auth/register').send(pendaftaranBaru())
    const { id, token } = { id: daftar.body.pengguna.id, token: daftar.body.token }
    idDibuat.push(id)

    const hapus = await request(app).post('/api/privasi/hapus').set('Authorization', `Bearer ${token}`)
    expect(hapus.status).toBe(204)

    const p = await prisma.pengguna.findUniqueOrThrow({ where: { id } })
    expect(p.nama).toBe('Pengguna Dihapus')
    expect(p.nik).toBeNull()
    expect(p.aktif).toBe(false)

    const meLagi = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(meLagi.status).toBe(401)
  })
})
