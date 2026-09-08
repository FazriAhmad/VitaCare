import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'

export const authRouter = Router()

function sanitasi<T extends { passwordHash: string }>(u: T) {
  const { passwordHash, ...aman } = u
  return aman
}

authRouter.post('/login', async (req, res) => {
  const { email, sandi } = req.body as { email?: string; sandi?: string }
  if (!email || !sandi) return res.status(400).json({ ok: false, pesan: 'Email dan kata sandi wajib diisi.' })

  const u = await prisma.pengguna.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!u) return res.status(404).json({ ok: false, pesan: 'Email tidak terdaftar.' })

  const cocok = await bcrypt.compare(sandi, u.passwordHash)
  if (!cocok) return res.status(401).json({ ok: false, pesan: 'Kata sandi salah. Coba lagi.' })
  if (!u.aktif) return res.status(403).json({ ok: false, pesan: 'Akun Anda dinonaktifkan. Hubungi admin.' })

  const diperbarui = await prisma.pengguna.update({ where: { id: u.id }, data: { terakhirLogin: new Date() } })
  await catat({ id: u.id, nama: u.nama, peran: u.peran }, 'MASUK', 'Sesi', `${u.nama} masuk sebagai ${u.peran}`, req.ip)

  res.json({ ok: true, pesan: `Selamat datang, ${u.nama.split(',')[0]}!`, pengguna: sanitasi(diperbarui) })
})

authRouter.post('/register', async (req, res) => {
  const { nama, email, sandi, telepon, nik, cabangId } = req.body as {
    nama?: string; email?: string; sandi?: string; telepon?: string; nik?: string; cabangId?: string
  }
  if (!nama || !email || !sandi || !telepon || !cabangId) {
    return res.status(400).json({ ok: false, pesan: 'Semua kolom wajib diisi.' })
  }

  const emailBersih = email.trim().toLowerCase()
  const ada = await prisma.pengguna.findUnique({ where: { email: emailBersih } })
  if (ada) return res.status(409).json({ ok: false, pesan: 'Email sudah terdaftar. Gunakan email lain.' })

  const passwordHash = await bcrypt.hash(sandi, 12)
  const baru = await prisma.pengguna.create({
    data: { nama: nama.trim(), email: emailBersih, passwordHash, peran: 'pasien', telepon, nik, cabangId, izinTambahan: [], izinDicabut: [] },
  })

  await catat({ id: baru.id, nama: baru.nama, peran: baru.peran }, 'DAFTAR', 'Pengguna', `Pendaftaran akun pasien ${baru.nama}`, req.ip)
  await prisma.notifikasi.create({
    data: {
      judul: 'Akun berhasil dibuat',
      pesan: `Selamat datang di VitaCare, ${baru.nama}. Anda dapat langsung mengambil nomor antrian.`,
      tipe: 'sukses',
      untukPenggunaId: baru.id,
    },
  })

  res.status(201).json({ ok: true, pesan: 'Pendaftaran berhasil!', pengguna: sanitasi(baru) })
})
