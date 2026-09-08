import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { wajibIzin } from '../middleware/otorisasi.js'

export const auditRouter = Router()

auditRouter.get('/', wajibIzin('lihat_audit'), async (_req, res) => {
  res.json(await prisma.auditLog.findMany({ orderBy: { waktu: 'desc' }, take: 600 }))
})
