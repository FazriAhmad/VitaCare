import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { prisma } from './lib/prisma.js'
import { aktorMiddleware } from './middleware/aktor.js'
import { authRouter } from './routes/auth.js'
import { masterRouter } from './routes/master.js'
import { penggunaRouter } from './routes/pengguna.js'
import { antrianRouter } from './routes/antrian.js'
import { janjiTemuRouter } from './routes/janjiTemu.js'
import { notifikasiRouter } from './routes/notifikasi.js'
import { pengaturanRouter } from './routes/pengaturan.js'
import { auditRouter } from './routes/audit.js'
import { privasiRouter } from './routes/privasi.js'

export const app = express()
app.use(cors())
app.use(express.json())
// Log tiap request ke stdout — jalur monitoring paling murah, cukup untuk skala satu proses ini.
if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'))
app.use(aktorMiddleware)

/** Cek benar-benar hidup, bukan cuma "proses Node menyala" — memastikan koneksi DB masih tersambung. */
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, layanan: 'vitacare-api', db: 'tersambung' })
  } catch {
    res.status(503).json({ ok: false, layanan: 'vitacare-api', db: 'terputus' })
  }
})

app.use('/api/auth', authRouter)
app.use('/api', masterRouter)
app.use('/api/pengguna', penggunaRouter)
app.use('/api/antrian', antrianRouter)
app.use('/api/janji-temu', janjiTemuRouter)
app.use('/api/notifikasi', notifikasiRouter)
app.use('/api/pengaturan', pengaturanRouter)
app.use('/api/audit', auditRouter)
app.use('/api/privasi', privasiRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const pesan = err instanceof Error ? err.message : 'Terjadi kesalahan pada server.'
  res.status(500).json({ ok: false, pesan })
})
