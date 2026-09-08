import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'
import { jalankanSeed } from '../lib/seedData.js'

export const pengaturanRouter = Router()

async function ambilAtauBuat() {
  return prisma.pengaturan.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} })
}

pengaturanRouter.get('/', async (_req, res) => {
  res.json(await ambilAtauBuat())
})

pengaturanRouter.patch('/', async (req, res) => {
  await ambilAtauBuat()
  const hasil = await prisma.pengaturan.update({ where: { id: 1 }, data: req.body })
  await catat(req.aktor, 'UBAH_PENGATURAN', 'Sistem', `Memperbarui pengaturan: ${Object.keys(req.body).join(', ')}`, req.ip)
  res.json(hasil)
})

/** Zona berbahaya: hapus data transaksional & kembalikan master data ke set seed awal. */
pengaturanRouter.post('/reset-sistem', async (req, res) => {
  await prisma.$transaction([
    prisma.antrian.deleteMany({}),
    prisma.janjiTemu.deleteMany({}),
    prisma.notifikasi.deleteMany({}),
    prisma.auditLog.deleteMany({}),
  ])
  await jalankanSeed(prisma)
  await catat(req.aktor, 'RESET_SISTEM', 'Sistem', 'Mengembalikan seluruh data ke kondisi awal', req.ip)
  res.status(204).end()
})
