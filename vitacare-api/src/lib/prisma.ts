import { PrismaClient } from '@prisma/client'
import { dekripsi, enkripsi } from './crypto.js'

/**
 * Enkripsi at-rest untuk NIK & telepon pengguna (PRD Fase 6) — dipasang di
 * satu titik lewat Prisma Client Extension, bukan dipanggil manual di tiap
 * route. `nik`/`telepon` tidak pernah dipakai sebagai filter `where` di
 * mana pun di codebase ini (diperiksa sebelum menulis ini), jadi aman
 * dienkripsi transparan tanpa mematahkan query manapun.
 */
const FIELD_RAHASIA = ['nik', 'telepon'] as const
type ObjekPengguna = Record<string, unknown>

function enkripsiField(obj: ObjekPengguna | null | undefined) {
  if (!obj) return
  for (const f of FIELD_RAHASIA) {
    if (typeof obj[f] === 'string' && obj[f]) obj[f] = enkripsi(obj[f] as string)
  }
}

function dekripsiField(obj: ObjekPengguna | null | undefined) {
  if (!obj) return
  for (const f of FIELD_RAHASIA) {
    if (typeof obj[f] === 'string' && obj[f]) obj[f] = dekripsi(obj[f] as string)
  }
}

// Operasi yang hasilnya berbentuk record Pengguna (bukan angka/agregat) -> perlu didekripsi sebelum dipakai pemanggil.
const OPERASI_HASIL_RECORD = new Set([
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'create', 'update', 'upsert', 'delete',
])

export const prisma = new PrismaClient().$extends({
  name: 'enkripsi-data-pribadi',
  query: {
    pengguna: {
      async $allOperations({ operation, args, query }) {
        const a = args as { data?: unknown; create?: ObjekPengguna; update?: ObjekPengguna }
        if (operation === 'upsert') {
          enkripsiField(a.create)
          enkripsiField(a.update)
        } else if (a.data !== undefined) {
          if (Array.isArray(a.data)) a.data.forEach((d) => enkripsiField(d as ObjekPengguna))
          else enkripsiField(a.data as ObjekPengguna)
        }

        const hasil = await query(args)

        if (OPERASI_HASIL_RECORD.has(operation)) {
          if (Array.isArray(hasil)) hasil.forEach((r) => dekripsiField(r as ObjekPengguna))
          else dekripsiField(hasil as ObjekPengguna | null)
        }
        return hasil
      },
    },
  },
})
