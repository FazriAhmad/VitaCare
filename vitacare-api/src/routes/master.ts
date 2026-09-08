import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'

export const masterRouter = Router()

/* --------------------------------------------------------------- cabang */

masterRouter.get('/cabang', async (_req, res) => {
  res.json(await prisma.cabang.findMany({ orderBy: { nama: 'asc' } }))
})

masterRouter.post('/cabang', async (req, res) => {
  const c = req.body
  const ada = await prisma.cabang.findUnique({ where: { id: c.id } })
  const hasil = await prisma.cabang.upsert({ where: { id: c.id }, create: c, update: c })
  await catat(req.aktor, ada ? 'UBAH_CABANG' : 'TAMBAH_CABANG', 'Cabang', hasil.nama, req.ip)
  res.json(hasil)
})

masterRouter.delete('/cabang/:id', async (req, res) => {
  const c = await prisma.cabang.delete({ where: { id: req.params.id } }).catch(() => null)
  if (c) await catat(req.aktor, 'HAPUS_CABANG', 'Cabang', `Menghapus cabang ${c.nama}`, req.ip)
  res.status(204).end()
})

/* ----------------------------------------------------------------- poli */

masterRouter.get('/poli', async (_req, res) => {
  res.json(await prisma.poli.findMany({ orderBy: { nama: 'asc' } }))
})

masterRouter.post('/poli', async (req, res) => {
  const p = req.body
  const ada = await prisma.poli.findUnique({ where: { id: p.id } })
  const hasil = await prisma.poli.upsert({ where: { id: p.id }, create: p, update: p })
  await catat(req.aktor, ada ? 'UBAH_POLI' : 'TAMBAH_POLI', 'Poli', hasil.nama, req.ip)
  res.json(hasil)
})

masterRouter.delete('/poli/:id', async (req, res) => {
  const p = await prisma.poli.delete({ where: { id: req.params.id } }).catch(() => null)
  if (p) await catat(req.aktor, 'HAPUS_POLI', 'Poli', `Menghapus poli ${p.nama}`, req.ip)
  res.status(204).end()
})

/* --------------------------------------------------------------- dokter */

masterRouter.get('/dokter', async (_req, res) => {
  res.json(await prisma.dokter.findMany({ orderBy: { nama: 'asc' } }))
})

masterRouter.post('/dokter', async (req, res) => {
  const { id, ...data } = req.body
  const ada = id ? await prisma.dokter.findUnique({ where: { id } }) : null
  const hasil = ada
    ? await prisma.dokter.update({ where: { id }, data })
    : await prisma.dokter.create({ data })
  await catat(req.aktor, ada ? 'UBAH_DOKTER' : 'TAMBAH_DOKTER', 'Dokter', hasil.nama, req.ip)
  res.json(hasil)
})

masterRouter.delete('/dokter/:id', async (req, res) => {
  const d = await prisma.dokter.delete({ where: { id: req.params.id } }).catch(() => null)
  if (d) await catat(req.aktor, 'HAPUS_DOKTER', 'Dokter', `Menghapus dokter ${d.nama}`, req.ip)
  res.status(204).end()
})

/* --------------------------------------------------------------- jadwal */

masterRouter.get('/jadwal', async (req, res) => {
  const { dokterId } = req.query as { dokterId?: string }
  res.json(await prisma.jadwal.findMany({ where: dokterId ? { dokterId } : undefined, orderBy: { hari: 'asc' } }))
})

masterRouter.post('/jadwal', async (req, res) => {
  const { id, ...data } = req.body
  const ada = id ? await prisma.jadwal.findUnique({ where: { id } }) : null
  const hasil = ada
    ? await prisma.jadwal.update({ where: { id }, data })
    : await prisma.jadwal.create({ data })
  const dokter = await prisma.dokter.findUnique({ where: { id: hasil.dokterId } })
  await catat(req.aktor, ada ? 'UBAH_JADWAL' : 'TAMBAH_JADWAL', 'Jadwal', `${dokter?.nama ?? '-'} hari ${hasil.hari} ${hasil.mulai}-${hasil.selesai}`, req.ip)
  res.json(hasil)
})

masterRouter.delete('/jadwal/:id', async (req, res) => {
  await prisma.jadwal.delete({ where: { id: req.params.id } }).catch(() => null)
  await catat(req.aktor, 'HAPUS_JADWAL', 'Jadwal', 'Menghapus satu slot jadwal praktik', req.ip)
  res.status(204).end()
})
