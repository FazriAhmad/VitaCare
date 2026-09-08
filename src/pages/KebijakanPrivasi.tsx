import { PakaiShellPublik } from './ShellPublik'
import { pakaiDB } from '../lib/db'

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">{judul}</h2>
      <div className="mt-2.5 space-y-2.5 text-[13.5px] leading-relaxed text-ink-600">{children}</div>
    </section>
  )
}

export function KebijakanPrivasi() {
  const db = pakaiDB()
  const namaRs = db.pengaturan.namaRs || 'VitaCare'

  return (
    <PakaiShellPublik>
      <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">Dokumen Resmi</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-950">Kebijakan Privasi {namaRs}</h1>
        <p className="mt-2 text-[13px] text-ink-400">Berlaku sejak 8 September 2026 · Ditinjau setiap tahun</p>

        <p className="mt-6 text-[13.5px] leading-relaxed text-ink-600">
          Dokumen ini menjelaskan data pribadi apa yang dikumpulkan {namaRs} melalui sistem antrian VitaCare, untuk
          apa data itu dipakai, berapa lama disimpan, dan hak Anda atas data tersebut — sesuai Undang-Undang
          Perlindungan Data Pribadi (UU PDP).
        </p>

        <Bagian judul="1. Data yang kami kumpulkan">
          <p>Saat Anda mendaftar akun pasien atau mengambil nomor antrian sebagai tamu, kami mengumpulkan:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong className="text-ink-800">Data identitas</strong> — nama, email, nomor telepon, dan NIK (opsional, untuk keperluan rekam kunjungan).</li>
            <li><strong className="text-ink-800">Data kunjungan</strong> — poli/dokter yang dituju, alasan berobat yang Anda tuliskan, waktu ambil/panggil/selesai antrian, dan riwayat janji temu.</li>
            <li><strong className="text-ink-800">Data teknis</strong> — alamat IP dan waktu aktivitas, dicatat dalam audit log untuk keamanan sistem.</li>
          </ul>
        </Bagian>

        <Bagian judul="2. Untuk apa data ini dipakai">
          <ul className="ml-4 list-disc space-y-1">
            <li>Menjalankan sistem antrian: memanggil nomor Anda, memberi estimasi waktu tunggu, mengirim notifikasi status.</li>
            <li>Menyimpan riwayat kunjungan Anda sendiri agar bisa dilihat kembali lewat akun.</li>
            <li>Audit keamanan &amp; operasional — mendeteksi penyalahgunaan sistem oleh staf maupun pihak luar.</li>
          </ul>
          <p>Data Anda <strong className="text-ink-800">tidak pernah dijual atau dibagikan</strong> ke pihak ketiga untuk kepentingan pemasaran.</p>
        </Bagian>

        <Bagian judul="3. Bagaimana data Anda dilindungi">
          <ul className="ml-4 list-disc space-y-1">
            <li>Kata sandi disimpan dalam bentuk hash (bcrypt) — tidak seorang pun, termasuk staf kami, bisa melihat kata sandi asli Anda.</li>
            <li>NIK dan nomor telepon dienkripsi (AES-256-GCM) sebelum disimpan ke database — data mentahnya tidak terbaca meski database diakses langsung.</li>
            <li>Sesi masuk memakai token yang kedaluwarsa otomatis setelah 12 jam.</li>
            <li>Setiap perubahan data oleh staf tercatat permanen di audit log dan tidak bisa dihapus sepihak, termasuk oleh admin.</li>
          </ul>
        </Bagian>

        <Bagian judul="4. Berapa lama data disimpan">
          <ul className="ml-4 list-disc space-y-1">
            <li><strong className="text-ink-800">Data akun &amp; riwayat kunjungan</strong> — selama akun Anda aktif, atau sampai Anda meminta penghapusan (lihat bagian 5).</li>
            <li><strong className="text-ink-800">Audit log</strong> — disimpan 2 tahun untuk keperluan keamanan &amp; kepatuhan, lalu dihapus permanen secara berkala.</li>
          </ul>
        </Bagian>

        <Bagian judul="5. Hak Anda atas data pribadi">
          <ul className="ml-4 list-disc space-y-1">
            <li><strong className="text-ink-800">Hak akses &amp; portabilitas</strong> — unduh seluruh data yang kami simpan tentang Anda dalam format JSON, kapan saja, lewat halaman akun Anda.</li>
            <li><strong className="text-ink-800">Hak koreksi</strong> — ubah data profil Anda sendiri kapan saja setelah masuk.</li>
            <li><strong className="text-ink-800">Hak hapus</strong> — minta data pribadi Anda dianonimkan dan akun dinonaktifkan. Riwayat antrian tetap tersimpan tanpa identitas Anda, untuk menjaga integritas data operasional &amp; audit.</li>
          </ul>
          <p>Ketiga hak ini tersedia langsung dari dasbor akun Anda, tanpa perlu menghubungi siapa pun.</p>
        </Bagian>

        <Bagian judul="6. Persetujuan">
          <p>
            Dengan mendaftar akun pasien, Anda menyetujui pengumpulan dan pemrosesan data sesuai kebijakan ini.
            Anda dapat mencabut persetujuan kapan saja dengan menghapus akun (bagian 5) — ini akan menghentikan
            pemrosesan data pribadi Anda ke depannya.
          </p>
        </Bagian>

        <Bagian judul="7. Kontak">
          <p>
            Pertanyaan tentang data pribadi Anda dapat diajukan ke petugas loket cabang {namaRs} terdekat, atau
            administrator sistem di cabang tempat Anda terdaftar.
          </p>
        </Bagian>
      </div>
    </PakaiShellPublik>
  )
}
