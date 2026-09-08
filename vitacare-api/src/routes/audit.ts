import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const auditRouter = Router()

auditRouter.get('/', async (_req, res) => {
  res.json(await prisma.auditLog.findMany({ orderBy: { waktu: 'desc' }, take: 600 }))
})
