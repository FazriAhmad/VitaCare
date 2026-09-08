import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'
import { wajibMasuk } from '../middleware/otorisasi.js'

export const privasiRouter = Router()
privasiRouter.use(wajibMasuk)

/**
 * Hak portabilitas data (UU PDP / PRD Fase 6): satu berkas JSON berisi
 * seluruh data yang tersimpan tentang pengguna ini — profil, antrian, dan
 * janji temu miliknya sendiri. Tidak menyertakan hash password.
 */
privasiRouter.get('/ekspor', async (req, res) => {
  const id = req.aktor!.id
  const [profil, antrian, janjiTemu] = await Promise.all([
    prisma.pengguna.findUniqueOrThrow({ where: { id } }),
    prisma.antrian.findMany({ where: { pasienId: id }, orderBy: { ambilPada: 'desc' } }),
    prisma.janjiTemu.findMany({ where: { pasienId: id }, orderBy: { dibuatPada: 'desc' } }),
  ])
  const { passwordHash: _abaikan, ...profilAman } = profil

  res.setHeader('Content-Disposition', `attachment; filename="vitacare-data-${id}.json"`)
  res.json({ diekspurPada: new Date().toISOString(), profil: profilAman, antrian, janjiTemu })
})

/**
 * Hak hapus (PRD Fase 6): anonimkan alih-alih hard delete — riwayat antrian
 * & audit log yang mereferensikan pasienId ini tetap perlu ada untuk
 * integritas operasional/audit, tapi data pribadinya sendiri dihapus.
 * Akun langsung dinonaktifkan; token lama otomatis ditolak permintaan
 * berikutnya (aktorMiddleware memeriksa `aktif`).
 */
privasiRouter.post('/hapus', async (req, res) => {
  const aktor = req.aktor!
  const placeholder = `dihapus-${aktor.id}@vitacare.invalid`

  await prisma.pengguna.update({
    where: { id: aktor.id },
    data: {
      nama: 'Pengguna Dihapus',
      email: placeholder,
      telepon: '-',
      nik: null,
      tanggalLahir: null,
      jenisKelamin: null,
      avatar: null,
      aktif: false,
    },
  })
  await catat(aktor, 'HAPUS_DATA_PRIBADI', 'Pengguna', `${aktor.nama} meminta penghapusan data pribadinya sendiri`, req.ip)
  res.status(204).end()
})
