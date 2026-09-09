import 'dotenv/config'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const run = promisify(execFile)

/** Di lingkungan ini pg_dump tidak ada di PATH — set PG_BIN_DIR di .env kalau perlu. Di CI/Linux biasanya sudah ada di PATH, jadi tidak perlu diisi. */
function bin(nama: string): string {
  const dir = process.env.PG_BIN_DIR
  return dir ? path.join(dir, nama) : nama
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL belum diset di .env')

  const dir = path.resolve('backups')
  await mkdir(dir, { recursive: true })
  const stempel = new Date().toISOString().replace(/[:.]/g, '-')
  const berkas = path.join(dir, `vitecare-${stempel}.dump`)

  await run(bin('pg_dump'), ['--format=custom', `--file=${berkas}`, url])
  const info = await stat(berkas)
  console.log(`Backup tersimpan: ${berkas} (${(info.size / 1024).toFixed(0)} KB)`)
}

main().catch((e) => {
  console.error('Backup gagal:', e.message ?? e)
  process.exit(1)
})
