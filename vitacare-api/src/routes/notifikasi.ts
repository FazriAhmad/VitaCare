import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'
import { wajibIzin, wajibMasuk } from '../middleware/otorisasi.js'

export const notifikasiRouter = Router()
notifikasiRouter.use(wajibMasuk)

/** Selalu berdasarkan identitas dari token, bukan parameter yang dikirim klien. */
notifikasiRouter.get('/', async (req, res) => {
  const daftar = await prisma.notifikasi.findMany({
    where: { OR: [{ untukPenggunaId: req.aktor!.id }, { untukPenggunaId: null }] },
    orderBy: { dibuatPada: 'desc' },
    take: 120,
  })
  res.json(daftar)
})

notifikasiRouter.patch('/dibaca', async (req, res) => {
  const { id } = req.body as { id?: string }
  await prisma.notifikasi.updateMany({
    where: { ...(id ? { id } : {}), OR: [{ untukPenggunaId: req.aktor!.id }, { untukPenggunaId: null }] },
    data: { dibaca: true },
  })
  res.status(204).end()
})

notifikasiRouter.delete('/:id', async (req, res) => {
  await prisma.notifikasi.deleteMany({ where: { id: req.params.id, OR: [{ untukPenggunaId: req.aktor!.id }, { untukPenggunaId: null }] } })
  res.status(204).end()
})

notifikasiRouter.post('/pengumuman', wajibIzin('kirim_notifikasi'), async (req, res) => {
  const { judul, pesan, untukPenggunaId } = req.body as { judul: string; pesan: string; untukPenggunaId?: string }
  const n = await prisma.notifikasi.create({ data: { judul, pesan, tipe: 'info', untukPenggunaId } })
  await catat(req.aktor, 'KIRIM_NOTIFIKASI', 'Notifikasi', `${judul} -> ${untukPenggunaId ? 'perorangan' : 'seluruh pasien'}`, req.ip)
  res.status(201).json(n)
})
