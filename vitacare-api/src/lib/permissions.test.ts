import { describe, expect, it } from 'vitest'
import { boleh, hitungIzin } from './permissions.js'

const pengguna = (over: Partial<Parameters<typeof boleh>[0] & object> = {}) => ({
  peran: 'petugas' as const,
  izinTambahan: [] as string[],
  izinDicabut: [] as string[],
  ...over,
})

describe('hitungIzin', () => {
  it('mengembalikan set kosong untuk null/undefined', () => {
    expect(hitungIzin(null).size).toBe(0)
    expect(hitungIzin(undefined).size).toBe(0)
  })

  it('petugas mendapat izin bawaan perannya, bukan izin admin', () => {
    const izin = hitungIzin(pengguna({ peran: 'petugas' }))
    expect(izin.has('kelola_antrian')).toBe(true)
    expect(izin.has('kelola_pengguna')).toBe(false) // hanya admin
  })

  it('izinTambahan menambah izin di luar bawaan peran', () => {
    const izin = hitungIzin(pengguna({ peran: 'pasien', izinTambahan: ['lihat_audit'] }))
    expect(izin.has('lihat_audit')).toBe(true)
  })

  it('izinDicabut mencabut izin bawaan', () => {
    const izin = hitungIzin(pengguna({ peran: 'petugas', izinDicabut: ['kelola_antrian'] }))
    expect(izin.has('kelola_antrian')).toBe(false)
  })
})

describe('boleh', () => {
  it('menolak aktor null', () => {
    expect(boleh(null, 'kelola_antrian')).toBe(false)
  })

  it('admin boleh melakukan apa saja kecuali izin yang eksplisit dicabut', () => {
    const admin = pengguna({ peran: 'admin' })
    expect(boleh(admin, 'kelola_pengguna')).toBe(true)
    expect(boleh(admin, 'ubah_pengaturan')).toBe(true)
  })

  it('izin admin yang dicabut tetap ditolak walau perannya admin', () => {
    const admin = pengguna({ peran: 'admin', izinDicabut: ['kelola_pengguna'] })
    expect(boleh(admin, 'kelola_pengguna')).toBe(false)
    expect(boleh(admin, 'ubah_pengaturan')).toBe(true) // izin lain tetap utuh
  })

  it('pasien tidak boleh kelola_antrian meski memaksa lewat request langsung', () => {
    const pasien = pengguna({ peran: 'pasien' })
    expect(boleh(pasien, 'kelola_antrian')).toBe(false)
    expect(boleh(pasien, 'ambil_nomor')).toBe(true)
  })
})
