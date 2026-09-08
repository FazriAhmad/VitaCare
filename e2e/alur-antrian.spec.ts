import { test, expect, type APIRequestContext } from '@playwright/test'

/**
 * Satu alur inti end-to-end: pasien ambil nomor → petugas panggil → petugas
 * selesaikan. Ini BUKAN matriks lengkap tiap peran (dokter/admin punya alur
 * serupa lewat komponen yang sama) — cakupan disengaja dipersempit ke jalur
 * yang paling bernilai. Lihat PRD Fase 5 kalau mau diperluas.
 */

const API = 'http://localhost:4010/api'
const CABANG_ID = 'cbg_jkt'

async function masuk(request: APIRequestContext, email: string, sandi: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, sandi } })
  expect(res.ok(), await res.text()).toBeTruthy()
  return (await res.json()).token as string
}

// Bersihkan sisa antrian cabang ini tiap test selesai — apa pun hasilnya —
// supaya kegagalan sebelumnya tidak ikut mencemari test berikutnya.
test.afterEach(async ({ request }) => {
  const token = await masuk(request, 'admin@vitacare.id', 'admin123')
  await request.post(`${API}/antrian/reset-harian`, { headers: { Authorization: `Bearer ${token}` }, data: { cabangId: CABANG_ID } })
})

test('pasien ambil nomor, petugas panggil lalu selesaikan', async ({ page }) => {
  // ---- pasien: login lewat UI, ambil nomor ----
  await page.goto('/#/login')
  await page.getByText('pasien@vitacare.id', { exact: true }).click()
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/#\/app/)

  await page.goto('/#/ambil')
  await page.getByRole('heading', { name: 'Poli Umum', exact: true }).click()

  const [resAmbil] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/antrian') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Ambil Nomor Sekarang' }).click(),
  ])
  const antrian = await resAmbil.json()
  expect(antrian.kode).toMatch(/^UMU-\d{2}$/)
  await expect(page.getByText('Nomor antrian berhasil diambil')).toBeVisible()

  // localStorage.clear() saja tidak cukup — sesi pengguna juga hidup di
  // memori modul db.ts, jadi perlu reload penuh supaya benar-benar keluar.
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // ---- petugas: login, cari nomor itu, panggil, lalu selesaikan ----
  await page.goto('/#/login')
  await page.getByText('petugas@vitacare.id', { exact: true }).click()
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/#\/petugas/)

  await page.goto('/#/petugas/antrian')
  await page.getByPlaceholder('Cari kode / nama…').fill(antrian.kode)

  // Baris antrian dirender sebagai <div class="... border-b border-ink-50 ...">,
  // dipakai untuk membatasi klik Panggil/Selesai hanya pada baris tiket ini —
  // filter pencarian tidak menjamin cuma satu baris tersisa (mis. sisa data uji lain).
  const baris = page.locator('div.border-b.border-ink-50', { hasText: antrian.kode })
  await expect(baris).toHaveCount(1)

  await baris.getByRole('button', { name: 'Panggil', exact: true }).click()
  await expect(baris.getByText('Dipanggil', { exact: true })).toBeVisible()

  await baris.getByRole('button', { name: 'Selesai', exact: true }).click()
  await expect(baris.getByText('Selesai', { exact: true })).toBeVisible()
})
