import crypto from 'node:crypto'

const KEY: Buffer = (() => {
  const v = process.env.ENCRYPTION_KEY
  if (!v) throw new Error('ENCRYPTION_KEY belum diset di .env')
  const buf = Buffer.from(v, 'base64')
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY harus 32 byte (base64) untuk AES-256-GCM')
  return buf
})()

const ALGORITMA = 'aes-256-gcm'
const PANJANG_IV = 12

/** Format tersimpan: "v1:<iv base64>:<tag base64>:<ciphertext base64>" — bisa dipakai untuk data pribadi apa pun, bukan cuma NIK/telepon. */
export function enkripsi(teks: string): string {
  const iv = crypto.randomBytes(PANJANG_IV)
  const cipher = crypto.createCipheriv(ALGORITMA, KEY, iv)
  const isi = Buffer.concat([cipher.update(teks, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${isi.toString('base64')}`
}

export function dekripsi(nilai: string): string {
  const bagian = nilai.split(':')
  if (bagian.length !== 4 || bagian[0] !== 'v1') return nilai // data lama/belum terenkripsi -> kembalikan apa adanya
  const [, ivB64, tagB64, isiB64] = bagian
  const decipher = crypto.createDecipheriv(ALGORITMA, KEY, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const teks = Buffer.concat([decipher.update(Buffer.from(isiB64, 'base64')), decipher.final()])
  return teks.toString('utf8')
}
