import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'
import { wajibIzin } from '../middleware/otorisasi.js'

export const auditRouter = Router()

/** Kebijakan retensi (PRD Fase 6 / non-fungsional): audit log disimpan 2 tahun. */
export const RETENSI_AUDIT_HARI = 730

auditRouter.get('/', wajibIzin('lihat_audit'), async (_req, res) => {
  res.json(await prisma.auditLog.findMany({ orderBy: { waktu: 'desc' }, take: 600 }))
})

/**
 * Hapus entri audit log yang lebih tua dari kebijakan retensi. Tindakan ini
 * sendiri dicatat (satu baris baru) sebelum baris lama dihapus, supaya
 * jejak "kapan &amp; siapa yang memurnikan log" tidak ikut hilang.
 */
auditRouter.post('/purge-retensi', wajibIzin('ubah_pengaturan'), async (req, res) => {
  const batas = new Date(Date.now() - RETENSI_AUDIT_HARI * 24 * 60 * 60 * 1000)
  const jumlah = await prisma.auditLog.count({ where: { waktu: { lt: batas } } })
  await catat(req.aktor, 'PURGE_RETENSI_AUDIT', 'Sistem', `Menghapus ${jumlah} entri audit log lebih tua dari ${RETENSI_AUDIT_HARI} hari`, req.ip)
  await prisma.auditLog.deleteMany({ where: { waktu: { lt: batas } } })
  res.json({ ok: true, dihapus: jumlah })
})
