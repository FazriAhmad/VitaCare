import type { NextFunction, Request, Response } from 'express'
import type { Peran } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { verifikasiToken } from '../lib/jwt.js'

export interface Aktor {
  id: string
  nama: string
  peran: Peran
  izinTambahan: string[]
  izinDicabut: string[]
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
 * Membaca `Authorization: Bearer <jwt>`, memverifikasi tanda tangannya, lalu
 * mengambil data pengguna TERKINI dari database (bukan dari klaim token) —
 * supaya perubahan peran/izin/nonaktifkan akun langsung berlaku, bukan
 * menunggu token lama kedaluwarsa.
 */
export async function aktorMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  const penggunaId = token ? verifikasiToken(token) : null
  if (!penggunaId) {
    req.aktor = null
    return next()
  }

  const u = await prisma.pengguna.findUnique({
    where: { id: penggunaId },
    select: { id: true, nama: true, peran: true, izinTambahan: true, izinDicabut: true, aktif: true },
  })
  req.aktor = u && u.aktif ? { id: u.id, nama: u.nama, peran: u.peran, izinTambahan: u.izinTambahan, izinDicabut: u.izinDicabut } : null
  next()
}
