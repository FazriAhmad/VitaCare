/**
 * Seed data referensi (cabang, poli, dokter, jadwal, akun demo tiap peran).
 * Sengaja TIDAK memuat ratusan baris antrian riwayat palsu seperti versi
 * frontend (src/lib/seed.ts) — itu cuma untuk membuat grafik demo terlihat
 * ramai di localStorage. Database produksi mulai kosong dan terisi dari
 * pemakaian nyata.
 */
import bcrypt from 'bcryptjs'
import type { prisma as PrismaExtended } from './prisma.js'

type PrismaClient = typeof PrismaExtended

const FOTO = ['/img/dokter1.jpg', '/img/dokter2.jpg', '/img/dokter3.jpg', '/img/dokter4.jpg']

export async function jalankanSeed(prisma: PrismaClient) {
  const cabang = [
    { id: 'cbg_jkt', kode: 'VIT-JKT', nama: 'VitaCare Menteng', kota: 'Jakarta Pusat', alamat: 'Jl. Cikini Raya No. 45, Menteng', telepon: '021-3921-4455', warna: '#0c8672', aktif: true },
    { id: 'cbg_bdg', kode: 'VIT-BDG', nama: 'VitaCare Dago', kota: 'Bandung', alamat: 'Jl. Ir. H. Juanda No. 210, Dago', telepon: '022-2504-8890', warna: '#2563eb', aktif: true },
    { id: 'cbg_sby', kode: 'VIT-SBY', nama: 'VitaCare Tunjungan', kota: 'Surabaya', alamat: 'Jl. Tunjungan No. 88, Genteng', telepon: '031-5316-7720', warna: '#d97706', aktif: true },
    { id: 'cbg_dps', kode: 'VIT-DPS', nama: 'VitaCare Renon', kota: 'Denpasar', alamat: 'Jl. Nakula No. 12, Sanur', telepon: '0361-288-9012', warna: '#7c3aed', aktif: true },
  ]
  for (const c of cabang) await prisma.cabang.upsert({ where: { id: c.id }, create: c, update: c })

  const poliMentah = [
    { kode: 'UMU', nama: 'Poli Umum', deskripsi: 'Pemeriksaan umum, konsultasi, dan rujukan awal.', ruang: 'Ruang A-01', lantai: 'Lantai 1', warna: '#0c8672', ikon: 'stetoskop', rata: 6 },
    { kode: 'ANK', nama: 'Poli Anak', deskripsi: 'Tumbuh kembang, imunisasi, dan penyakit anak.', ruang: 'Ruang B-02', lantai: 'Lantai 2', warna: '#f59e0b', ikon: 'bayi', rata: 8 },
    { kode: 'GIG', nama: 'Poli Gigi & Mulut', deskripsi: 'Perawatan gigi, pencabutan, dan pembersihan karang.', ruang: 'Ruang C-01', lantai: 'Lantai 1', warna: '#14b8a6', ikon: 'gigi', rata: 12 },
    { kode: 'KAN', nama: 'Poli Kandungan', deskripsi: 'Kebidanan, USG, dan kesehatan ibu.', ruang: 'Ruang B-03', lantai: 'Lantai 2', warna: '#ec4899', ikon: 'hamil', rata: 10 },
    { kode: 'JAN', nama: 'Poli Jantung', deskripsi: 'EKG, treadmill, dan konsultasi kardiologi.', ruang: 'Ruang D-01', lantai: 'Lantai 3', warna: '#ef4444', ikon: 'jantung', rata: 11 },
    { kode: 'MAT', nama: 'Poli Mata', deskripsi: 'Pemeriksaan refraksi, glaukoma, dan katarak.', ruang: 'Ruang D-02', lantai: 'Lantai 3', warna: '#3b82f6', ikon: 'mata', rata: 9 },
    { kode: 'THT', nama: 'Poli THT', deskripsi: 'Telinga, hidung, dan tenggorokan.', ruang: 'Ruang A-02', lantai: 'Lantai 1', warna: '#8b5cf6', ikon: 'tht', rata: 7 },
    { kode: 'KUL', nama: 'Poli Kulit & Kelamin', deskripsi: 'Alergi, dermatitis, dan perawatan kulit.', ruang: 'Ruang A-03', lantai: 'Lantai 1', warna: '#06b6d4', ikon: 'kulit', rata: 7 },
    { kode: 'SAR', nama: 'Poli Saraf', deskripsi: 'Migrain, kejang, dan gangguan neurologi.', ruang: 'Ruang E-01', lantai: 'Lantai 3', warna: '#64748b', ikon: 'saraf', rata: 12 },
    { kode: 'IGD', nama: 'Instalasi Gawat Darurat', deskripsi: 'Layanan 24 jam untuk kondisi darurat.', ruang: 'Zona Merah', lantai: 'Lantai 1', warna: '#dc2626', ikon: 'ambulans', rata: 5 },
  ]
  const semuaCabang = cabang.map((c) => c.id)
  for (const [i, p] of poliMentah.entries()) {
    await prisma.poli.upsert({
      where: { id: `poli_${p.kode.toLowerCase()}` },
      create: {
        id: `poli_${p.kode.toLowerCase()}`, kode: p.kode, nama: p.nama, deskripsi: p.deskripsi, ruang: p.ruang,
        lantai: p.lantai, warna: p.warna, ikon: p.ikon, rataLayanan: p.rata,
        cabangIds: i < 8 ? semuaCabang : [cabang[0].id, cabang[1].id], aktif: true,
      },
      update: {},
    })
  }

  const dokterMentah: Array<[string, string, string]> = [
    ['dr. Andi Wijaya, Sp.PD', 'Spesialis Penyakit Dalam', 'Poli Umum'],
    ['dr. Siti Rahmawati, Sp.A', 'Spesialis Anak', 'Poli Anak'],
    ['dr. Budi Hartono, Drg., Sp.KG', 'Spesialis Konservasi Gigi', 'Poli Gigi & Mulut'],
    ['dr. Maya Puspita, Sp.OG', 'Spesialis Obstetri & Ginekologi', 'Poli Kandungan'],
    ['dr. Rudi Setiawan, Sp.JP', 'Spesialis Jantung & Pembuluh Darah', 'Poli Jantung'],
    ['dr. Lina Kusuma, Sp.M', 'Spesialis Mata', 'Poli Mata'],
    ['dr. Hendra Gunawan, Sp.THT', 'Spesialis THT-KL', 'Poli THT'],
    ['dr. Dewi Anggraini, Sp.KK', 'Spesialis Kulit & Kelamin', 'Poli Kulit & Kelamin'],
    ['dr. Fajar Nugroho, Sp.S', 'Spesialis Saraf', 'Poli Saraf'],
    ['dr. Ahmad Fauzi, Sp.PD', 'Spesialis Penyakit Dalam', 'Poli Umum'],
    ['dr. Wulan Safitri, Sp.A', 'Spesialis Anak', 'Poli Anak'],
    ['dr. Yusuf Maulana, Sp.B', 'Spesialis Bedah Umum', 'Poli Umum'],
    ['dr. Ratna Sari, Sp.An', 'Spesialis Anestesiologi', 'Instalasi Gawat Darurat'],
    ['dr. Indah Permata, Sp.M', 'Spesialis Mata', 'Poli Mata'],
  ]
  const poliByNama = new Map((await prisma.poli.findMany()).map((p) => [p.nama, p]))
  const dokterDibuat = []
  for (const [i, [nama, spesialis, poliNama]] of dokterMentah.entries()) {
    const poli = poliByNama.get(poliNama)!
    const email = `${nama.split(',')[0].toLowerCase().replace(/[^a-z. ]/g, '').replace('dr.', '').trim().replace(/\s+/g, '.')}@vitacare.id`
    const d = await prisma.dokter.upsert({
      where: { email },
      create: {
        nama, spesialis, sip: `SIP-${(2026000 + i * 137).toString().slice(0, 7)}`, poliId: poli.id,
        telepon: `081${2 + (i % 7)}-${(1200 + i * 37).toString().slice(0, 4)}-${(4000 + i * 53).toString().slice(0, 4)}`,
        email, foto: FOTO[i % FOTO.length], rating: Math.round((4.3 + Math.random() * 0.65) * 10) / 10,
        aktif: true, bergabung: `20${16 + (i % 9)}-0${1 + (i % 8)}-1${(i % 9) + 1}`,
      },
      update: {},
    })
    dokterDibuat.push(d)

    const hariKerja = [1, 2, 3, 4, 5, 6]
    for (const hari of hariKerja) {
      if ((i + hari) % 5 === 4) continue
      const cabangId = i % 4 === 0 ? 'cbg_bdg' : 'cbg_jkt'
      if (i % 3 !== 2) {
        await prisma.jadwal.create({ data: { dokterId: d.id, hari, mulai: '08:00', selesai: '12:00', kuota: 24 + (i % 3) * 6, cabangId, aktif: true } })
      }
      if (i % 2 === 0) {
        await prisma.jadwal.create({ data: { dokterId: d.id, hari, mulai: '13:00', selesai: '16:00', kuota: 16 + (i % 4) * 4, cabangId, aktif: true } })
      }
    }
  }

  const akunDemo: Array<[string, string, string, 'admin' | 'petugas' | 'dokter' | 'pasien', string, string, string | undefined]> = [
    ['Rina Kartika', 'admin@vitacare.id', 'admin123', 'admin', '0811-1000-2001', 'cbg_jkt', undefined],
    ['Dewi Lestari', 'petugas@vitacare.id', 'petugas123', 'petugas', '0811-1000-2002', 'cbg_jkt', undefined],
    ['dr. Andi Wijaya, Sp.PD', 'dokter@vitacare.id', 'dokter123', 'dokter', '0812-3000-1001', 'cbg_jkt', 'poli_umu'],
    ['Budi Santoso', 'pasien@vitacare.id', 'pasien123', 'pasien', '0813-4400-7788', 'cbg_jkt', undefined],
    ['Sri Wahyuni', 'sri@mail.id', 'sandi123', 'pasien', '0813-5511-2233', 'cbg_jkt', undefined],
    ['Bayu Anggara', 'bayu@vitacare.id', 'sandi123', 'petugas', '0815-2233-4455', 'cbg_bdg', undefined],
    ['dr. Siti Rahmawati, Sp.A', 'siti@vitacare.id', 'sandi123', 'dokter', '0816-3344-5566', 'cbg_jkt', 'poli_ank'],
  ]
  for (const [nama, email, sandi, peran, telepon, cabangId, poliId] of akunDemo) {
    await prisma.pengguna.upsert({
      where: { email },
      create: {
        nama, email, passwordHash: await bcrypt.hash(sandi, 12), peran, telepon, cabangId, poliId,
        izinTambahan: [], izinDicabut: [], persetujuanPada: peran === 'pasien' ? new Date() : undefined,
      },
      update: {},
    })
  }

  await prisma.pengaturan.upsert({
    where: { id: 1 },
    create: { id: 1, namaRs: 'RS VitaCare', jamBuka: '07:30', jamTutup: '20:00', suaraPanggilan: true, notifikasiBrowser: false, modeSimulasi: false, selisihPanggilan: 4 },
    update: {},
  })

  console.log(`Seed selesai: ${cabang.length} cabang, ${poliMentah.length} poli, ${dokterDibuat.length} dokter, ${akunDemo.length} akun demo.`)
}
