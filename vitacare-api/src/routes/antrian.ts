import { Router } from 'express'
import { Prisma, type StatusAntrian, type Prioritas } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'
import { hariIniISO, pad2 } from '../lib/util.js'

export const antrianRouter = Router()

antrianRouter.get('/', async (req, res) => {
  const { cabangId, poliId, aktifSaja } = req.query as { cabangId?: string; poliId?: string; aktifSaja?: string }
  const where: Prisma.AntrianWhereInput = {
    ...(cabangId ? { cabangId } : {}),
    ...(poliId ? { poliId } : {}),
    ...(aktifSaja === 'true' ? { status: { notIn: ['selesai', 'batal'] } } : {}),
  }
  const daftar = await prisma.antrian.findMany({ where, orderBy: { ambilPada: 'asc' } })
  res.json(daftar)
})

/**
 * Ambil nomor baru. Nomor urut dihitung & baris antrian dibuat dalam satu
 * transaksi serializable dengan retry, supaya dua loket yang input
 * bersamaan tidak pernah menghasilkan nomor kembar (lih. PRD Fase 1 —
 * risiko race condition).
 */
async function ambilNomorTx(input: {
  poliId: string; cabangId: string; dokterId?: string; nama: string; telepon: string
  alasan: string; prioritas: Prioritas; pasienId?: string
}) {
  const MAKS_ULANG = 5
  for (let percobaan = 0; percobaan < MAKS_ULANG; percobaan++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const poli = await tx.poli.findUniqueOrThrow({ where: { id: input.poliId } })
        const hari = hariIniISO()
        const jumlah = await tx.antrian.count({
          where: { poliId: input.poliId, cabangId: input.cabangId, ambilPada: { gte: new Date(`${hari}T00:00:00.000Z`), lt: new Date(`${hari}T23:59:59.999Z`) } },
        })
        const nomor = jumlah + 1
        const antre = await tx.antrian.count({ where: { poliId: input.poliId, cabangId: input.cabangId, status: { notIn: ['selesai', 'batal'] } } })
        const estimasiAwal = Math.max(2, Math.round(antre * poli.rataLayanan * 0.8))

        let dokterId = input.dokterId
        if (!dokterId) {
          const hariKe = new Date().getDay()
          const jadwalAktif = await tx.jadwal.findFirst({ where: { hari: hariKe, cabangId: input.cabangId, aktif: true, dokter: { poliId: input.poliId, aktif: true } } })
          dokterId = jadwalAktif?.dokterId ?? (await tx.dokter.findFirstOrThrow({ where: { poliId: input.poliId } })).id
        }

        return tx.antrian.create({
          data: {
            kode: `${poli.kode}-${pad2(nomor)}`,
            nomor,
            poliId: poli.id,
            dokterId,
            cabangId: input.cabangId,
            pasienId: input.pasienId ?? '',
            pasienNama: input.nama.trim(),
            telepon: input.telepon,
            alasan: input.alasan,
            prioritas: input.prioritas,
            status: 'menunggu',
            ambilPada: new Date(),
            estimasiAwal,
          },
        })
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (err) {
      const kodeErr = (err as { code?: string }).code
      if (kodeErr === 'P2034' && percobaan < MAKS_ULANG - 1) continue // serialization conflict -> ulangi
      throw err
    }
  }
  throw new Error('Gagal mengambil nomor antrian setelah beberapa percobaan.')
}

antrianRouter.post('/', async (req, res) => {
  const antrian = await ambilNomorTx(req.body)
  const poli = await prisma.poli.findUnique({ where: { id: antrian.poliId } })
  await catat(req.aktor, 'AMBIL_NOMOR', 'Antrian', `Nomor ${antrian.kode} untuk ${antrian.pasienNama} di ${poli?.nama}`, req.ip)
  await prisma.notifikasi.create({
    data: {
      judul: `Nomor antrian ${antrian.kode}`,
      pesan: `Anda terdaftar di ${poli?.nama}. Estimasi tunggu ±${antrian.estimasiAwal} menit. Tunjukkan QR saat dipanggil.`,
      tipe: 'info',
      untukPenggunaId: antrian.pasienId || undefined,
      tautan: `/status?kode=${antrian.kode}`,
    },
  })
  res.status(201).json(antrian)
})

antrianRouter.post('/:id/panggil', async (req, res) => {
  const target = await prisma.antrian.update({ where: { id: req.params.id }, data: { status: 'dipanggil', dipanggilPada: new Date() } })
  const poli = await prisma.poli.findUnique({ where: { id: target.poliId } })
  await catat(req.aktor, 'PANGGIL_ANTRIAN', 'Antrian', `Memanggil ${target.kode} ke ${poli?.ruang ?? '-'}`, req.ip)
  await prisma.notifikasi.create({
    data: {
      judul: `Nomor ${target.kode} dipanggil`,
      pesan: `Silakan menuju ${poli?.nama ?? 'poli'} — ${poli?.ruang ?? ''}.`,
      tipe: 'panggilan',
      untukPenggunaId: target.pasienId || undefined,
      tautan: `/status?kode=${target.kode}`,
    },
  })
  res.json(target)
})

antrianRouter.post('/panggil-berikutnya', async (req, res) => {
  const { poliId, cabangId } = req.body as { poliId: string; cabangId: string }
  const berikut = await prisma.antrian.findFirst({
    where: { poliId, cabangId, status: 'menunggu' },
    orderBy: [{ prioritas: 'asc' }, { ambilPada: 'asc' }],
  })
  if (!berikut) return res.status(404).json({ pesan: 'Tidak ada antrian menunggu.' })

  const target = await prisma.antrian.update({ where: { id: berikut.id }, data: { status: 'dipanggil', dipanggilPada: new Date() } })
  const poli = await prisma.poli.findUnique({ where: { id: target.poliId } })
  await catat(req.aktor, 'PANGGIL_ANTRIAN', 'Antrian', `Memanggil ${target.kode} ke ${poli?.ruang ?? '-'}`, req.ip)
  res.json(target)
})

antrianRouter.patch('/:id/status', async (req, res) => {
  const { status, catatan } = req.body as { status: StatusAntrian; catatan?: string }
  const target = await prisma.antrian.findUnique({ where: { id: req.params.id } })
  if (!target) return res.status(404).json({ pesan: 'Antrian tidak ditemukan.' })

  const data: Prisma.AntrianUpdateInput = { status }
  const waktu = new Date()
  if (status === 'dilayani') data.dilayaniPada = waktu
  if (status === 'selesai') {
    data.selesaiPada = waktu
    data.dilayaniPada = target.dilayaniPada ?? waktu
    data.dipanggilPada = target.dipanggilPada ?? waktu
  }
  if (catatan !== undefined) data.catatan = catatan

  const hasil = await prisma.antrian.update({ where: { id: target.id }, data })
  await catat(req.aktor, 'UBAH_STATUS', 'Antrian', `${target.kode} -> ${status}${catatan ? ` (${catatan})` : ''}`, req.ip)
  res.json(hasil)
})

antrianRouter.patch('/:id/prioritas', async (req, res) => {
  const { prioritas } = req.body as { prioritas: Prioritas }
  const hasil = await prisma.antrian.update({ where: { id: req.params.id }, data: { prioritas } })
  await catat(req.aktor, 'UBAH_PRIORITAS', 'Antrian', `${hasil.kode} diubah ke prioritas ${prioritas}`, req.ip)
  await prisma.notifikasi.create({
    data: { judul: 'Prioritas diperbarui', pesan: `Antrian ${hasil.kode} kini berstatus prioritas ${prioritas}.`, tipe: 'peringatan', untukPenggunaId: hasil.pasienId || undefined },
  })
  res.json(hasil)
})

antrianRouter.patch('/:id/cabang', async (req, res) => {
  const { cabangId } = req.body as { cabangId: string }
  const target = await prisma.antrian.findUniqueOrThrow({ where: { id: req.params.id } })
  const poli = await prisma.poli.findUnique({ where: { id: target.poliId } })
  const hari = hariIniISO()
  const jumlah = await prisma.antrian.count({
    where: { poliId: target.poliId, cabangId, ambilPada: { gte: new Date(`${hari}T00:00:00.000Z`), lt: new Date(`${hari}T23:59:59.999Z`) } },
  })
  const nomor = jumlah + 1
  const hasil = await prisma.antrian.update({ where: { id: target.id }, data: { cabangId, nomor, kode: `${poli?.kode ?? 'AN'}-${pad2(nomor)}` } })
  const cabang = await prisma.cabang.findUnique({ where: { id: cabangId } })
  await catat(req.aktor, 'PINDAH_CABANG', 'Antrian', `${target.kode} dipindahkan ke cabang ${cabang?.nama}`, req.ip)
  res.json(hasil)
})

antrianRouter.post('/reset-harian', async (req, res) => {
  const { cabangId } = req.body as { cabangId: string }
  const hari = hariIniISO()
  await prisma.antrian.deleteMany({
    where: { cabangId, ambilPada: { gte: new Date(`${hari}T00:00:00.000Z`), lt: new Date(`${hari}T23:59:59.999Z`) } },
  })
  const cabang = await prisma.cabang.findUnique({ where: { id: cabangId } })
  await catat(req.aktor, 'RESET_ANTRIAN', 'Antrian', `Mereset antrian harian cabang ${cabang?.nama}`, req.ip)
  res.status(204).end()
})
