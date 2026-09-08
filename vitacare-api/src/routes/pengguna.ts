import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'
import { IZIN_BAWAAN } from '../lib/permissions.js'
import { wajibIzin } from '../middleware/otorisasi.js'

export const penggunaRouter = Router()
penggunaRouter.use(wajibIzin('kelola_pengguna'))

function sanitasi<T extends { passwordHash: string }>(u: T) {
  const { passwordHash, ...aman } = u
  return aman
}

penggunaRouter.get('/', async (req, res) => {
  const { cabangId } = req.query as { cabangId?: string }
  const daftar = await prisma.pengguna.findMany({ where: cabangId ? { cabangId } : undefined, orderBy: { nama: 'asc' } })
  res.json(daftar.map(sanitasi))
})

/** Tambah/ubah pengguna. Jika `sandi` disertakan, akan di-hash ulang. */
penggunaRouter.post('/', async (req, res) => {
  const { id, sandi, ...data } = req.body as Record<string, unknown> & { id?: string; sandi?: string }
  const ada = id ? await prisma.pengguna.findUnique({ where: { id } }) : null

  const payload: Record<string, unknown> = { ...data }
  if (sandi) payload.passwordHash = await bcrypt.hash(sandi, 12)

  const hasil = ada
    ? await prisma.pengguna.update({ where: { id: id! }, data: payload })
    : await prisma.pengguna.create({ data: { ...payload, passwordHash: payload.passwordHash ?? await bcrypt.hash(Math.random().toString(36), 12), izinTambahan: [], izinDicabut: [] } as never })

  await catat(req.aktor, ada ? 'UBAH_PENGGUNA' : 'TAMBAH_PENGGUNA', 'Pengguna', `${hasil.nama} (${hasil.peran})`, req.ip)
  res.json(sanitasi(hasil))
})

penggunaRouter.delete('/:id', async (req, res) => {
  const p = await prisma.pengguna.delete({ where: { id: req.params.id } }).catch(() => null)
  if (p) await catat(req.aktor, 'HAPUS_PENGGUNA', 'Pengguna', `Menghapus akun ${p.nama}`, req.ip)
  res.status(204).end()
})

penggunaRouter.patch('/:id/peran', async (req, res) => {
  const { peran } = req.body as { peran: 'admin' | 'petugas' | 'dokter' | 'pasien' }
  const p = await prisma.pengguna.update({ where: { id: req.params.id }, data: { peran, izinTambahan: [], izinDicabut: [] } })
  await catat(req.aktor, 'UBAH_PERAN', 'Pengguna', `Peran ${p.nama} diubah menjadi ${peran}`, req.ip)
  res.json(sanitasi(p))
})

penggunaRouter.patch('/:id/izin', async (req, res) => {
  const { izin, aktif } = req.body as { izin: string; aktif: boolean }
  const p = await prisma.pengguna.findUnique({ where: { id: req.params.id } })
  if (!p) return res.status(404).json({ pesan: 'Pengguna tidak ditemukan.' })

  const bawaan = IZIN_BAWAAN[p.peran].includes(izin)
  let tambahan = p.izinTambahan.filter((i) => i !== izin)
  let dicabut = p.izinDicabut.filter((i) => i !== izin)
  if (aktif) {
    if (!bawaan) tambahan = [...tambahan, izin]
  } else if (bawaan) {
    dicabut = [...dicabut, izin]
  }

  const hasil = await prisma.pengguna.update({ where: { id: p.id }, data: { izinTambahan: tambahan, izinDicabut: dicabut } })
  await catat(req.aktor, 'UBAH_IZIN', 'Perizinan', `${p.nama}: ${izin} -> ${aktif ? 'diizinkan' : 'dicabut'}`, req.ip)
  res.json(sanitasi(hasil))
})
