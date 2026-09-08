import type { Peran } from '@prisma/client'
import { prisma } from './prisma.js'
import type { Aktor } from '../middleware/aktor.js'

export async function catat(aktor: Aktor | null, aksi: string, entitas: string, detail: string, ip = '0.0.0.0') {
  await prisma.auditLog.create({
    data: {
      aktorId: aktor?.id ?? 'tamu',
      aktorNama: aktor?.nama ?? 'Tamu / Kiosk',
      aktorPeran: (aktor?.peran ?? 'pasien') as Peran,
      aksi,
      entitas,
      detail,
      ip,
    },
  })
}
