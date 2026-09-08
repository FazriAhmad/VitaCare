import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'
import { hariIniISO, pad2 } from '../lib/util.js'
import { boleh } from '../lib/permissions.js'
import { wajibIzin, wajibMasuk } from '../middleware/otorisasi.js'

export const janjiTemuRouter = Router()
janjiTemuRouter.use(wajibMasuk)

janjiTemuRouter.get('/', async (req, res) => {
  const kelola = boleh(req.aktor, 'kelola_janji_temu')
  res.json(await prisma.janjiTemu.findMany({ where: kelola ? {} : { pasienId: req.aktor!.id }, orderBy: { dibuatPada: 'desc' } }))
})

janjiTemuRouter.post('/', async (req, res) => {
  const { pasienId, dokterId, tanggal, jam, alasan, cabangId } = req.body as {
    pasienId: string; dokterId: string; tanggal: string; jam: string; alasan: string; cabangId: string
  }
  if (pasienId !== req.aktor!.id && !boleh(req.aktor, 'kelola_janji_temu')) {
    return res.status(403).json({ ok: false, pesan: 'Anda hanya dapat membuat janji temu untuk diri sendiri.' })
  }
  const [pasien, dokter] = await Promise.all([
    prisma.pengguna.findUnique({ where: { id: pasienId } }),
    prisma.dokter.findUniqueOrThrow({ where: { id: dokterId } }),
  ])

  const baru = await prisma.janjiTemu.create({
    data: {
      kode: `JT-${Math.floor(1000 + Math.random() * 8999)}`,
      pasienId,
      pasienNama: pasien?.nama ?? 'Pasien',
      dokterId: dokter.id,
      poliId: dokter.poliId,
      cabangId,
      tanggal,
      jam,
      alasan,
      status: 'menunggu',
    },
  })

  await catat(req.aktor, 'BUAT_JANJI_TEMU', 'Janji Temu', `${baru.kode} dengan ${dokter.nama} pada ${baru.tanggal} ${baru.jam}`, req.ip)
  await prisma.notifikasi.create({
    data: { judul: 'Janji temu dibuat', pesan: `Janji temu ${baru.kode} bersama ${dokter.nama} pada ${baru.tanggal} pukul ${baru.jam}.`, tipe: 'sukses', untukPenggunaId: baru.pasienId },
  })
  res.status(201).json(baru)
})

janjiTemuRouter.patch('/:id/status', async (req, res) => {
  const { status } = req.body as { status: 'menunggu' | 'dikonfirmasi' | 'selesai' | 'batal' }
  const target = await prisma.janjiTemu.findUnique({ where: { id: req.params.id } })
  if (!target) return res.status(404).json({ pesan: 'Janji temu tidak ditemukan.' })

  const kelola = boleh(req.aktor, 'kelola_janji_temu')
  const pemilikMembatalkan = status === 'batal' && target.pasienId === req.aktor!.id
  if (!kelola && !pemilikMembatalkan) return res.status(403).json({ ok: false, pesan: 'Anda tidak dapat mengubah janji temu ini.' })

  const hasil = await prisma.janjiTemu.update({ where: { id: req.params.id }, data: { status } })
  await catat(req.aktor, 'UBAH_JANJI_TEMU', 'Janji Temu', `${hasil.kode} -> ${status}`, req.ip)
  await prisma.notifikasi.create({
    data: { judul: `Janji temu ${status}`, pesan: `Janji temu ${hasil.kode} Anda telah ${status}.`, tipe: status === 'batal' ? 'peringatan' : 'info', untukPenggunaId: hasil.pasienId },
  })
  res.json(hasil)
})

/** Konversi janji temu menjadi nomor antrian aktif hari ini. */
janjiTemuRouter.post('/:id/ke-antrian', wajibIzin('kelola_janji_temu'), async (req, res) => {
  const jt = await prisma.janjiTemu.findUniqueOrThrow({ where: { id: req.params.id } })
  const [poli, pasien] = await Promise.all([
    prisma.poli.findUniqueOrThrow({ where: { id: jt.poliId } }),
    prisma.pengguna.findUnique({ where: { id: jt.pasienId } }),
  ])

  const hari = hariIniISO()
  const jumlah = await prisma.antrian.count({
    where: { poliId: jt.poliId, cabangId: jt.cabangId, ambilPada: { gte: new Date(`${hari}T00:00:00.000Z`), lt: new Date(`${hari}T23:59:59.999Z`) } },
  })
  const nomor = jumlah + 1

  const antrian = await prisma.antrian.create({
    data: {
      kode: `${poli.kode}-${pad2(nomor)}`,
      nomor,
      poliId: jt.poliId,
      dokterId: jt.dokterId,
      cabangId: jt.cabangId,
      pasienId: jt.pasienId,
      pasienNama: jt.pasienNama,
      telepon: pasien?.telepon ?? '-',
      alasan: jt.alasan,
      prioritas: 'reguler',
      status: 'menunggu',
      ambilPada: new Date(),
      estimasiAwal: Math.max(2, Math.round(jumlah * poli.rataLayanan * 0.8)),
    },
  })
  await prisma.janjiTemu.update({ where: { id: jt.id }, data: { status: 'selesai', antrianId: antrian.id } })
  res.status(201).json(antrian)
})
