import type { NextFunction, Request, Response } from 'express'
import type { Peran } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export interface Aktor {
  id: string
  nama: string
  peran: Peran
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      aktor: Aktor | null
    }
  }
}

/**
 * Fase 1: identitas pemanggil dikirim via header X-User-Id, bukan token bertanda
 * tangan. Cukup untuk mencatat audit log & sinkron data lintas perangkat;
 * belum aman untuk mem-blokir akses tanpa izin — itu pekerjaan Fase 2 (JWT).
 */
export async function aktorMiddleware(req: Request, _res: Response, next: NextFunction) {
  const id = req.header('x-user-id')
  if (!id) {
    req.aktor = null
    return next()
  }
  const u = await prisma.pengguna.findUnique({ where: { id }, select: { id: true, nama: true, peran: true } })
  req.aktor = u ?? null
  next()
}
