import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Tanpa SMTP_HOST di .env (mis. lingkungan dev ini), otomatis pakai akun uji
 * Ethereal — email tidak benar-benar terkirim, tapi bisa dibuka lewat URL
 * pratinjau yang dicetak ke console. Set SMTP_HOST/USER/PASS untuk produksi.
 */
function buatTransporter(): Promise<Transporter> {
  if (process.env.SMTP_HOST) {
    return Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      }),
    )
  }
  return nodemailer.createTestAccount().then((akun) =>
    nodemailer.createTransport({ host: akun.smtp.host, port: akun.smtp.port, secure: akun.smtp.secure, auth: { user: akun.user, pass: akun.pass } }),
  )
}

let transporterPromise: Promise<Transporter> | null = null
function transporter(): Promise<Transporter> {
  if (!transporterPromise) transporterPromise = buatTransporter()
  return transporterPromise
}

const DARI = process.env.SMTP_FROM ?? 'VitaCare <no-reply@vitacare.id>'

function bungkus(judul: string, isi: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#12191A">
      <div style="width:36px;height:36px;border-radius:10px;background:#0c8672;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;margin-bottom:16px">V</div>
      <h2 style="margin:0 0 12px;font-size:18px">${judul}</h2>
      <div style="font-size:14px;line-height:1.6;color:#3A4744">${isi}</div>
      <p style="margin-top:24px;font-size:11px;color:#A7B2AC">VitaCare — Sistem Antrian Rumah Sakit</p>
    </div>`
}

/**
 * Kirim langsung (bukan lewat queue) — cukup untuk skala saat ini. Kegagalan
 * SMTP dicatat ke log dan tidak pernah menggagalkan request pemanggilnya;
 * email di sini pelengkap notifikasi in-app, bukan jalur utama.
 * ponytail: kalau volume naik jauh, pindahkan ke worker+outbox agar retry.
 */
export async function kirimEmail(tujuan: string | null | undefined, subjek: string, judul: string, isi: string) {
  if (!tujuan) return
  try {
    const t = await transporter()
    const info = await t.sendMail({ from: DARI, to: tujuan, subject: subjek, html: bungkus(judul, isi) })
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) console.log(`[email] "${subjek}" ke ${tujuan} — pratinjau: ${previewUrl}`)
  } catch (err) {
    console.error(`[email] gagal mengirim ke ${tujuan}:`, err)
  }
}
