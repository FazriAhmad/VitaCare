import type { Antrian, DB, Dokter, JanjiTemu, Jadwal, Pengguna, Peran, Prioritas, StatusAntrian } from './types'
import { pad2, uid } from './utils'

function acak(seed: number) {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FOTO = ['/img/dokter1.jpg', '/img/dokter2.jpg', '/img/dokter3.jpg', '/img/dokter4.jpg']

export function seedDB(): DB {
  const r = acak(20260905)

  const cabang = [
    { id: 'cbg_jkt', kode: 'VIT-JKT', nama: 'VitaCare Menteng', kota: 'Jakarta Pusat', alamat: 'Jl. Cikini Raya No. 45, Menteng', telepon: '021-3921-4455', warna: '#0c8672', aktif: true },
    { id: 'cbg_bdg', kode: 'VIT-BDG', nama: 'VitaCare Dago', kota: 'Bandung', alamat: 'Jl. Ir. H. Juanda No. 210, Dago', telepon: '022-2504-8890', warna: '#2563eb', aktif: true },
    { id: 'cbg_sby', kode: 'VIT-SBY', nama: 'VitaCare Tunjungan', kota: 'Surabaya', alamat: 'Jl. Tunjungan No. 88, Genteng', telepon: '031-5316-7720', warna: '#d97706', aktif: true },
    { id: 'cbg_dps', kode: 'VIT-DPS', nama: 'VitaCare Renon', kota: 'Denpasar', alamat: 'Jl. Nakula No. 12, Sanur', telepon: '0361-288-9012', warna: '#7c3aed', aktif: true },
  ]

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

  const poli = poliMentah.map((p, i) => ({
    id: `poli_${p.kode.toLowerCase()}`,
    kode: p.kode,
    nama: p.nama,
    deskripsi: p.deskripsi,
    ruang: p.ruang,
    lantai: p.lantai,
    warna: p.warna,
    ikon: p.ikon,
    rataLayanan: p.rata,
    cabangIds: i < 8 ? cabang.map((c) => c.id) : [cabang[0].id, cabang[1].id],
    aktif: true,
  }))

  const dokterMentah: Array<[string, string, string]> = [
    ['dr. Andi Wijaya, Sp.PD', 'Spesialis Penyakit Dalam', 'POLI UMUM'],
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

  const dokter: Dokter[] = dokterMentah.map(([nama, spesialis, poliNama], i) => {
    const p = poli.find((x) => x.nama === poliNama) ?? poli[0]
    return {
      id: `dok_${i + 1}`,
      nama,
      spesialis,
      sip: `SIP-${(2026000 + i * 137).toString().slice(0, 7)}`,
      poliId: p.id,
      telepon: `081${(2 + (i % 7))}-${(1200 + i * 37).toString().slice(0, 4)}-${(4000 + i * 53).toString().slice(0, 4)}`,
      email: nama.split(',')[0].toLowerCase().replace(/[^a-z.]/g, '').replace('dr.', 'dr.') + '@vitacare.id',
      foto: FOTO[i % FOTO.length],
      rating: Math.round((4.3 + r() * 0.65) * 10) / 10,
      aktif: true,
      bergabung: `20${16 + (i % 9)}-0${1 + (i % 8)}-1${(i % 9) + 1}`,
    }
  })

  const jadwal: Jadwal[] = []
  const hariKerja = [1, 2, 3, 4, 5, 6]
  dokter.forEach((d, di) => {
    hariKerja.forEach((hari) => {
      if ((di + hari) % 5 === 4) return
      const pagi = di % 3 !== 2
      if (pagi) {
        jadwal.push({
          id: uid('jdw'), dokterId: d.id, hari, mulai: '08:00', selesai: '12:00',
          kuota: 24 + (di % 3) * 6, cabangId: di % 4 === 0 ? 'cbg_bdg' : 'cbg_jkt', aktif: true,
        })
      }
      if (di % 2 === 0) {
        jadwal.push({
          id: uid('jdw'), dokterId: d.id, hari, mulai: '13:00', selesai: '16:00',
          kuota: 16 + (di % 4) * 4, cabangId: di % 4 === 0 ? 'cbg_bdg' : 'cbg_jkt', aktif: true,
        })
      }
    })
  })

  const pengguna: Pengguna[] = [
    mk('pgu_admin', 'Rina Kartika', 'admin@vitacare.id', 'admin123', 'admin', '0811-1000-2001', 'cbg_jkt'),
    mk('pgu_petugas', 'Dewi Lestari', 'petugas@vitacare.id', 'petugas123', 'petugas', '0811-1000-2002', 'cbg_jkt'),
    mk('pgu_dokter1', 'dr. Andi Wijaya, Sp.PD', 'dokter@vitacare.id', 'dokter123', 'dokter', '0812-3000-1001', 'cbg_jkt', 'poli_umu'),
    mk('pgu_pasien', 'Budi Santoso', 'pasien@vitacare.id', 'pasien123', 'pasien', '0813-4400-7788', 'cbg_jkt'),
    mk('pgu_pasien2', 'Sri Wahyuni', 'sri@mail.id', 'sandi123', 'pasien', '0813-5511-2233', 'cbg_jkt'),
    mk('pgu_pasien3', 'Agus Prasetyo', 'agus@mail.id', 'sandi123', 'pasien', '0821-7788-1122', 'cbg_bdg'),
    mk('pgu_petugas2', 'Bayu Anggara', 'bayu@vitacare.id', 'sandi123', 'petugas', '0815-2233-4455', 'cbg_bdg'),
    mk('pgu_dokter2', 'dr. Siti Rahmawati, Sp.A', 'siti@vitacare.id', 'sandi123', 'dokter', '0816-3344-5566', 'cbg_jkt', 'poli_ank'),
  ]

  const antrian: Antrian[] = []
  const akumulasi: Record<string, number> = {}

  for (let hariLalu = 13; hariLalu >= 1; hariLalu--) {
    const tgl = new Date()
    tgl.setDate(tgl.getDate() - hariLalu)
    if (tgl.getDay() === 0) continue
    const tanggalISO = tgl.toISOString().slice(0, 10)
    const total = 26 + Math.floor(r() * 16)
    for (let i = 0; i < total; i++) {
      const p = poli[Math.floor(r() * 8)]
      const dr = dokter.filter((x) => x.poliId === p.id)
      const d = dr.length ? dr[Math.floor(r() * dr.length)] : dokter[0]
      const nomor = (akumulasi[p.kode] = (akumulasi[p.kode] ?? 0) + 1)
      const jamAmbil = 7 * 60 + 30 + Math.floor(r() * 300)
      const ambil = new Date(tgl)
      ambil.setHours(Math.floor(jamAmbil / 60), jamAmbil % 60, 0, 0)
      const tunggu = Math.round(6 + r() * 46)
      const layan = Math.round(p.rataLayanan * (0.6 + r() * 1.1))
      const gagal = r() < 0.06
      const dipanggil = new Date(ambil.getTime() + tunggu * 60000)
      const selesai = new Date(dipanggil.getTime() + layan * 60000)
      antrian.push({
        id: uid('antrian'),
        kode: `${p.kode}-${pad2(nomor)}`,
        nomor,
        poliId: p.id,
        dokterId: d.id,
        cabangId: cabang[Math.floor(r() * 4)].id,
        pasienId: pengguna[4 + Math.floor(r() * 3)].id,
        pasienNama: namaAcak(r),
        telepon: `08${Math.floor(r() * 90) + 10}-${Math.floor(1000 + r() * 8999)}-${Math.floor(1000 + r() * 8999)}`,
        alasan: alasanAcak(r, p.nama),
        prioritas: prioritasAcak(r),
        status: gagal ? 'batal' : 'selesai',
        ambilPada: ambil.toISOString(),
        dipanggilPada: dipanggil.toISOString(),
        dilayaniPada: dipanggil.toISOString(),
        selesaiPada: selesai.toISOString(),
        estimasiAwal: tunggu,
        catatan: 'Riwayat pemeriksaan sebelumnya normal.',
      })
    }
  }

  // Antrian aktif hari ini
  const hariIni = new Date()
  const poliHariIni = poli.slice(0, 9)
  const alur: StatusAntrian[] = ['selesai', 'selesai', 'dilayani', 'dipanggil', 'menunggu', 'menunggu', 'menunggu', 'menunggu', 'batal']
  let nomorHariIni: Record<string, number> = {}
  nomorHariIni = { ...akumulasi }

  poliHariIni.forEach((p, pi) => {
    const dr = dokter.filter((x) => x.poliId === p.id)
    const aktifDokter = dr.length ? dr[0] : dokter[0]
    for (let i = 0; i < alur.length; i++) {
      const nomor = (nomorHariIni[p.kode] = (nomorHariIni[p.kode] ?? 0) + 1)
      const menitAmbil = 7 * 60 + 45 + i * 9 + pi
      const ambil = new Date()
      ambil.setHours(Math.floor(menitAmbil / 60), menitAmbil % 60, 0, 0)
      if (ambil.getTime() > Date.now()) continue
      const st = alur[i]
      const tunggu = Math.round(8 + r() * 34)
      const dipanggil = new Date(ambil.getTime() + tunggu * 60000)
      antrian.push({
        id: uid('antrian'),
        kode: `${p.kode}-${pad2(nomor)}`,
        nomor,
        poliId: p.id,
        dokterId: aktifDokter.id,
        cabangId: p.kode === 'SAR' ? 'cbg_bdg' : 'cbg_jkt',
        pasienId: st === 'selesai' || st === 'batal' ? pengguna[3 + (i % 3)].id : '',
        pasienNama: i === 0 && pi === 1 ? 'Budi Santoso' : namaAcak(r),
        telepon: `08${Math.floor(r() * 90) + 10}-${Math.floor(1000 + r() * 8999)}-${Math.floor(1000 + r() * 8999)}`,
        alasan: alasanAcak(r, p.nama),
        prioritas: i === 0 && pi === 4 ? 'lansia' : i % 4 === 1 ? 'hamil' : prioritasAcak(r),
        status: st,
        ambilPada: ambil.toISOString(),
        dipanggilPada: st !== 'menunggu' ? dipanggil.toISOString() : undefined,
        dilayaniPada: st === 'dilayani' || st === 'selesai' ? dipanggil.toISOString() : undefined,
        selesaiPada: st === 'selesai' ? new Date(dipanggil.getTime() + p.rataLayanan * 60000).toISOString() : undefined,
        estimasiAwal: tunggu,
      })
    }
  })

  const janjiTemu: JanjiTemu[] = []
  for (let i = 0; i < 9; i++) {
    const d = dokter[i]
    const tgl = new Date()
    tgl.setDate(tgl.getDate() + (i % 5) - 1)
    janjiTemu.push({
      id: uid('jt'),
      kode: `JT-${(2600 + i * 7).toString()}`,
      pasienId: pengguna[3 + (i % 3)].id,
      pasienNama: i === 0 ? 'Budi Santoso' : namaAcak(r),
      dokterId: d.id,
      poliId: d.poliId,
      cabangId: 'cbg_jkt',
      tanggal: tgl.toISOString().slice(0, 10),
      jam: i % 2 === 0 ? '09:30' : '13:30',
      alasan: alasanAcak(r, poli.find((x) => x.id === d.poliId)?.nama ?? 'Poli Umum'),
      status: i < 3 ? 'dikonfirmasi' : i < 7 ? 'menunggu' : 'batal',
      dibuatPada: new Date(Date.now() - (i + 1) * 5400000).toISOString(),
    })
  }

  return {
    versi: 3,
    cabang,
    poli,
    dokter,
    jadwal,
    antrian,
    janjiTemu,
    pengguna,
    notifikasi: [
      { id: uid('ntf'), judul: 'Selamat datang di VitaCare', pesan: 'Sistem antrian real-time telah aktif. Pantau nomor Anda dari ponsel.', tipe: 'info', dibaca: false, dibuatPada: new Date(Date.now() - 3600000).toISOString() },
      { id: uid('ntf'), judul: 'Kuota Gigi & Mulut hampir penuh', pesan: 'Sisa kuota pagi hari tinggal 4 nomor. Pertimbangkan janji temu sore.', tipe: 'peringatan', dibaca: false, dibuatPada: new Date(Date.now() - 7200000).toISOString() },
      { id: uid('ntf'), judul: 'dr. Rudi Setiawan tiba', pesan: 'Poli Jantung mulai melayani pasien dengan nomor berikutnya.', tipe: 'sukses', dibaca: true, dibuatPada: new Date(Date.now() - 10800000).toISOString() },
    ],
    audit: [
      { id: uid('aud'), waktu: new Date(Date.now() - 86400000).toISOString(), aktorId: 'pgu_admin', aktorNama: 'Rina Kartika', aktorPeran: 'admin', aksi: 'LOGIN', entitas: 'Sesi', detail: 'Masuk ke sistem dari perangkat desktop', ip: '10.10.4.21' },
      { id: uid('aud'), waktu: new Date(Date.now() - 43200000).toISOString(), aktorId: 'pgu_petugas', aktorNama: 'Dewi Lestari', aktorPeran: 'petugas', aksi: 'UBAH_PELAYANAN', entitas: 'Poli', detail: 'Mengubah rata-rata layanan Poli Gigi menjadi 12 menit', ip: '10.10.4.35' },
      { id: uid('aud'), waktu: new Date(Date.now() - 18000000).toISOString(), aktorId: 'pgu_dokter1', aktorNama: 'dr. Andi Wijaya, Sp.PD', aktorPeran: 'dokter', aksi: 'PANGGIL_ANTRIAN', entitas: 'Antrian', detail: 'Memanggil nomor UMU-041 ke Ruang A-01', ip: '10.10.5.12' },
    ],
    pengaturan: {
      namaRs: 'RS VitaCare',
      jamBuka: '07:30',
      jamTutup: '20:00',
      suaraPanggilan: true,
      notifikasiBrowser: false,
      modeSimulasi: true,
      selisihPanggilan: 4,
    },
  }
}

function mk(id: string, nama: string, email: string, sandi: string, peran: Peran, telepon: string, cabangId: string, poliId?: string): Pengguna {
  return {
    id, nama, email, sandi, peran, telepon, cabangId, poliId,
    aktif: true, izinTambahan: [], izinDicabut: [],
    dibuatPada: '2026-01-12T08:00:00.000Z',
    nik: `3175${Math.floor(1000000000 + Math.random() * 8999999999)}`,
    jenisKelamin: peran === 'dokter' && id === 'pgu_dokter2' ? 'P' : 'L',
    tanggalLahir: '1988-04-17',
  }
}

const NAMA = ['Andi Saputra', 'Putri Handayani', 'Muhammad Rizki', 'Dian Permata', 'Joko Susilo', 'Nur Aisyah', 'Hendra Kurniawan', 'Fitriani Rahma', 'Slamet Riyadi', 'Vina Oktaviani', 'Rangga Pratama', 'Larasati Dewi', 'Bagus Hermawan', 'Intan Nuraini', 'Taufik Hidayat', 'Melati Anggraini', 'Dimas Aditya', 'Ratih Kusumaningrum', 'Fajar Sidik', 'Ayu Lestari']

function namaAcak(r: () => number): string {
  return NAMA[Math.floor(r() * NAMA.length)]
}

const ALASAN: Record<string, string[]> = {
  default: ['Kontrol rutin', 'Demam 3 hari', 'Pusing dan lemas', 'Cek lab ulangan', 'Perpanjang resep', 'Keluhan ringan'],
  'Poli Gigi & Mulut': ['Nyeri gigi geraham', 'Kontrol behel', 'Pembersihan karang gigi', 'Gigi goyang'],
  'Poli Anak': ['Imunisasi rutin', 'Batuk pilek', 'Kontrol tumbuh kembang', 'Diare ringan'],
  'Poli Kandungan': ['Kontrol kehamilan trimester 3', 'USG terjadwal', 'Konsultasi program hamil'],
  'Poli Jantung': ['Kontrol tekanan darah', 'EKG terjadwal', 'Sesak saat beraktivitas'],
}

function alasanAcak(r: () => number, poliNama: string): string {
  const daftar = ALASAN[poliNama] ?? ALASAN.default
  return daftar[Math.floor(r() * daftar.length)]
}

function prioritasAcak(r: () => number): Prioritas {
  const v = r()
  if (v < 0.05) return 'darurat'
  if (v < 0.14) return 'lansia'
  if (v < 0.21) return 'hamil'
  if (v < 0.26) return 'difabel'
  return 'reguler'
}
