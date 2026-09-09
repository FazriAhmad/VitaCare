/**
 * Bukti "restore dari backup terbukti berhasil" (PRD Fase 7) — bukan cuma
 * skrip yang ada, tapi benar-benar dijalankan: restore backup terbaru ke
 * database sementara, bandingkan jumlah baris dengan database asli, lalu
 * buang database sementara itu. Tidak pernah menyentuh database kerja.
 */
import 'dotenv/config'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'

const run = promisify(execFile)

function bin(nama: string): string {
  const dir = process.env.PG_BIN_DIR
  return dir ? path.join(dir, nama) : nama
}

const TABEL = ['cabang', 'poli', 'dokter', 'jadwal', 'antrian', 'janjiTemu', 'pengguna', 'notifikasi', 'auditLog', 'pengaturan'] as const

async function main() {
  const urlAsli = process.env.DATABASE_URL
  if (!urlAsli) throw new Error('DATABASE_URL belum diset di .env')

  const dir = path.resolve('backups')
  const daftar = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.dump')).sort()
  const berkasTerbaru = daftar.at(-1)
  if (!berkasTerbaru) throw new Error('Tidak ada berkas backup di ./backups — jalankan `npm run backup` dulu.')
  const jalurBackup = path.join(dir, berkasTerbaru)
  console.log(`Menguji restore dari: ${berkasTerbaru}`)

  const u = new URL(urlAsli)
  const dbAsli = u.pathname.slice(1)
  const dbUji = `${dbAsli}_uji_restore`
  const env = { ...process.env, PGPASSWORD: u.password }
  const argKoneksi = ['-h', u.hostname, '-p', u.port || '5432', '-U', u.username]

  const uAdmin = new URL(urlAsli)
  uAdmin.pathname = '/postgres'

  await run(bin('psql'), [...argKoneksi, '-d', 'postgres', '-c', `DROP DATABASE IF EXISTS ${dbUji}`], { env })
  await run(bin('psql'), [...argKoneksi, '-d', 'postgres', '-c', `CREATE DATABASE ${dbUji}`], { env })
  console.log(`Database sementara dibuat: ${dbUji}`)

  await run(bin('pg_restore'), [...argKoneksi, '-d', dbUji, jalurBackup], { env })
  console.log('Restore selesai, membandingkan jumlah baris…')

  const uUji = new URL(urlAsli)
  uUji.pathname = `/${dbUji}`

  const asli = new PrismaClient({ datasources: { db: { url: urlAsli } } })
  const uji = new PrismaClient({ datasources: { db: { url: uUji.toString() } } })

  let semuaCocok = true
  for (const t of TABEL) {
    const jumlahAsli: number = await (asli as unknown as Record<string, { count: () => Promise<number> }>)[t].count()
    const jumlahUji: number = await (uji as unknown as Record<string, { count: () => Promise<number> }>)[t].count()
    const cocok = jumlahAsli === jumlahUji
    if (!cocok) semuaCocok = false
    console.log(`${cocok ? '✓' : '✗'} ${t}: asli=${jumlahAsli} restore=${jumlahUji}`)
  }

  await asli.$disconnect()
  await uji.$disconnect()
  await run(bin('psql'), [...argKoneksi, '-d', 'postgres', '-c', `DROP DATABASE ${dbUji}`], { env })
  console.log(`Database sementara ${dbUji} dibuang.`)

  if (!semuaCocok) {
    console.error('\nGAGAL: jumlah baris tidak cocok setelah restore.')
    process.exit(1)
  }
  console.log('\n✓ Restore terverifikasi berhasil — jumlah baris cocok di semua tabel.')
}

main().catch((e) => {
  console.error('Uji restore gagal:', e.message ?? e)
  process.exit(1)
})
