import 'dotenv/config'
import 'express-async-errors'
import { createServer } from 'node:http'
import express from 'express'
import cors from 'cors'
import { aktorMiddleware } from './middleware/aktor.js'
import { mulaiRealtime } from './lib/realtime.js'
import { authRouter } from './routes/auth.js'
import { masterRouter } from './routes/master.js'
import { penggunaRouter } from './routes/pengguna.js'
import { antrianRouter } from './routes/antrian.js'
import { janjiTemuRouter } from './routes/janjiTemu.js'
import { notifikasiRouter } from './routes/notifikasi.js'
import { pengaturanRouter } from './routes/pengaturan.js'
import { auditRouter } from './routes/audit.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(aktorMiddleware)

app.get('/api/health', (_req, res) => res.json({ ok: true, layanan: 'vitacare-api' }))

app.use('/api/auth', authRouter)
app.use('/api', masterRouter)
app.use('/api/pengguna', penggunaRouter)
app.use('/api/antrian', antrianRouter)
app.use('/api/janji-temu', janjiTemuRouter)
app.use('/api/notifikasi', notifikasiRouter)
app.use('/api/pengaturan', pengaturanRouter)
app.use('/api/audit', auditRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const pesan = err instanceof Error ? err.message : 'Terjadi kesalahan pada server.'
  res.status(500).json({ ok: false, pesan })
})

const server = createServer(app)
mulaiRealtime(server)

const port = Number(process.env.PORT ?? 4010)
server.listen(port, () => console.log(`vitacare-api jalan di http://localhost:${port}`))
