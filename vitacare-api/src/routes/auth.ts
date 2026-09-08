import { Router, type RequestHandler } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { prisma } from '../lib/prisma.js'
import { catat } from '../lib/audit.js'
import { terbitkanToken } from '../lib/jwt.js'
import { wajibMasuk } from '../middleware/otorisasi.js'

export const authRouter = Router()

// Nonaktif saat test: satu suite bisa login puluhan kali dalam hitungan detik
// (tiap test butuh sesi sendiri) — bukan pola serangan credential stuffing.
const batasMasuk: RequestHandler = process.env.NODE_ENV === 'test'
  ? (_req, _res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { ok: false, pesan: 'Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.' },
    })

function sanitasi<T extends { passwordHash: string }>(u: T) {
  const { passwordHash, ...aman } = u
  return aman
}

authRouter.post('/login', batasMasuk, async (req, res) => {
  const { email, sandi } = req.body as { email?: string; sandi?: string }
  if (!email || !sandi) return res.status(400).json({ ok: false, pesan: 'Email dan kata sandi wajib diisi.' })

  const u = await prisma.pengguna.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!u) return res.status(404).json({ ok: false, pesan: 'Email tidak terdaftar.' })

  const cocok = await bcrypt.compare(sandi, u.passwordHash)
  if (!cocok) return res.status(401).json({ ok: false, pesan: 'Kata sandi salah. Coba lagi.' })
  if (!u.aktif) return res.status(403).json({ ok: false, pesan: 'Akun Anda dinonaktifkan. Hubungi admin.' })

  const diperbarui = await prisma.pengguna.update({ where: { id: u.id }, data: { terakhirLogin: new Date() } })
  await catat({ id: u.id, nama: u.nama, peran: u.peran, izinTambahan: u.izinTambahan, izinDicabut: u.izinDicabut }, 'MASUK', 'Sesi', `${u.nama} masuk sebagai ${u.peran}`, req.ip)

  res.json({ ok: true, pesan: `Selamat datang, ${u.nama.split(',')[0]}!`, token: terbitkanToken(u.id), pengguna: sanitasi(diperbarui) })
})

authRouter.post('/register', batasMasuk, async (req, res) => {
  const { nama, email, sandi, telepon, nik, cabangId, setuju } = req.body as {
    nama?: string; email?: string; sandi?: string; telepon?: string; nik?: string; cabangId?: string; setuju?: boolean
  }
  if (!nama || !email || !sandi || !telepon || !cabangId) {
    return res.status(400).json({ ok: false, pesan: 'Semua kolom wajib diisi.' })
  }
  if (!setuju) {
    return res.status(400).json({ ok: false, pesan: 'Anda harus menyetujui Kebijakan Privasi untuk mendaftar.' })
  }

  const emailBersih = email.trim().toLowerCase()
  const ada = await prisma.pengguna.findUnique({ where: { email: emailBersih } })
  if (ada) return res.status(409).json({ ok: false, pesan: 'Email sudah terdaftar. Gunakan email lain.' })

  const passwordHash = await bcrypt.hash(sandi, 12)
  const baru = await prisma.pengguna.create({
    data: { nama: nama.trim(), email: emailBersih, passwordHash, peran: 'pasien', telepon, nik, cabangId, izinTambahan: [], izinDicabut: [], persetujuanPada: new Date() },
  })

  await catat({ id: baru.id, nama: baru.nama, peran: baru.peran, izinTambahan: [], izinDicabut: [] }, 'DAFTAR', 'Pengguna', `Pendaftaran akun pasien ${baru.nama}`, req.ip)
  await prisma.notifikasi.create({
    data: {
      judul: 'Akun berhasil dibuat',
      pesan: `Selamat datang di VitaCare, ${baru.nama}. Anda dapat langsung mengambil nomor antrian.`,
      tipe: 'sukses',
      untukPenggunaId: baru.id,
    },
  })

  res.status(201).json({ ok: true, pesan: 'Pendaftaran berhasil!', token: terbitkanToken(baru.id), pengguna: sanitasi(baru) })
})

/** Profil pengguna yang sedang masuk, ditentukan dari token — bukan dari input klien. */
authRouter.get('/me', wajibMasuk, async (req, res) => {
  const u = await prisma.pengguna.findUniqueOrThrow({ where: { id: req.aktor!.id } })
  res.json(sanitasi(u))
})
