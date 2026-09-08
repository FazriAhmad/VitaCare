import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'

export const notifikasiRouter = Router()

notifikasiRouter.get('/', async (req, res) => {
  const { penggunaId } = req.query as { penggunaId?: string }
  const daftar = await prisma.notifikasi.findMany({
    where: penggunaId ? { OR: [{ untukPenggunaId: penggunaId }, { untukPenggunaId: null }] } : undefined,
    orderBy: { dibuatPada: 'desc' },
    take: 120,
  })
  res.json(daftar)
})

notifikasiRouter.patch('/dibaca', async (req, res) => {
  const { id } = req.body as { id?: string }
  await prisma.notifikasi.updateMany({ where: id ? { id } : {}, data: { dibaca: true } })
  res.status(204).end()
})

notifikasiRouter.delete('/:id', async (req, res) => {
  await prisma.notifikasi.delete({ where: { id: req.params.id } }).catch(() => null)
  res.status(204).end()
})

notifikasiRouter.post('/pengumuman', async (req, res) => {
  const { judul, pesan, untukPenggunaId } = req.body as { judul: string; pesan: string; untukPenggunaId?: string }
  const n = await prisma.notifikasi.create({ data: { judul, pesan, tipe: 'info', untukPenggunaId } })
  await catat(req.aktor, 'KIRIM_NOTIFIKASI', 'Notifikasi', `${judul} -> ${untukPenggunaId ? 'perorangan' : 'seluruh pasien'}`, req.ip)
  res.status(201).json(n)
})
