import { describe, expect, it } from 'vitest'
import { boleh, hitungIzin } from './permissions'
import type { Peran, Pengguna } from './types'

function buatPengguna(peran: Peran, over: Partial<Pengguna> = {}): Pengguna {
  return {
    id: 'p1', nama: 'Tes', email: 'tes@vitacare.id', peran, telepon: '0800',
    aktif: true, izinTambahan: [], izinDicabut: [], dibuatPada: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('hitungIzin', () => {
  it('mengembalikan set kosong untuk null/undefined', () => {
    expect(hitungIzin(null).size).toBe(0)
    expect(hitungIzin(undefined).size).toBe(0)
  })

  it('petugas mendapat izin bawaan perannya, bukan izin admin', () => {
    const izin = hitungIzin(buatPengguna('petugas'))
    expect(izin.has('kelola_antrian')).toBe(true)
    expect(izin.has('kelola_pengguna')).toBe(false)
  })

  it('izinTambahan menambah izin di luar bawaan peran', () => {
    const izin = hitungIzin(buatPengguna('pasien', { izinTambahan: ['lihat_audit'] }))
    expect(izin.has('lihat_audit')).toBe(true)
  })

  it('izinDicabut mencabut izin bawaan', () => {
    const izin = hitungIzin(buatPengguna('petugas', { izinDicabut: ['kelola_antrian'] }))
    expect(izin.has('kelola_antrian')).toBe(false)
  })
})

describe('boleh', () => {
  it('menolak aktor null/undefined', () => {
    expect(boleh(null, 'kelola_antrian')).toBe(false)
    expect(boleh(undefined, 'kelola_antrian')).toBe(false)
  })

  it('admin boleh melakukan apa saja kecuali izin yang eksplisit dicabut', () => {
    const admin = buatPengguna('admin')
    expect(boleh(admin, 'kelola_pengguna')).toBe(true)
  })

  it('izin admin yang dicabut tetap ditolak walau perannya admin', () => {
    const admin = buatPengguna('admin', { izinDicabut: ['kelola_pengguna'] })
    expect(boleh(admin, 'kelola_pengguna')).toBe(false)
    expect(boleh(admin, 'ubah_pengaturan')).toBe(true)
  })

  it('pasien tidak boleh kelola_antrian', () => {
    const pasien = buatPengguna('pasien')
    expect(boleh(pasien, 'kelola_antrian')).toBe(false)
    expect(boleh(pasien, 'ambil_nomor')).toBe(true)
  })
})
