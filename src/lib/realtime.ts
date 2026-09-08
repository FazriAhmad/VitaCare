/**
 * Lapisan realtime VitaCare.
 * Menyimulasikan koneksi WebSocket dengan BroadcastChannel sehingga seluruh
 * tab peramban (loket, dokter, TV display) menyala bersamaan secara realtime.
 */

export type Paket =
  | { jenis: 'sinkron'; waktu: number; aktor: string }
  | { jenis: 'ping'; id: string; waktu: number }
  | { jenis: 'pong'; id: string; waktu: number }

const NAMA_KANAL = 'vitacare-realtime-v3'

class KanalRealtime {
  private kanal: BroadcastChannel | null = null
  private pendengar = new Set<(p: Paket) => void>()
  private pingTerakhir = 0
  private idPing = ''

  latensi = 0
  tersambung = false

  constructor() {
    if (typeof BroadcastChannel === 'undefined') return
    try {
      this.kanal = new BroadcastChannel(NAMA_KANAL)
      this.kanal.onmessage = (e: MessageEvent<Paket>) => this.tiba(e.data)
      this.tersambung = true
    } catch {
      this.tersambung = false
    }
  }

  private tiba(p: Paket) {
    if (!p) return
    if (p.jenis === 'ping') {
      this.kanal?.postMessage({ jenis: 'pong', id: p.id, waktu: p.waktu } satisfies Paket)
      return
    }
    if (p.jenis === 'pong' && p.id === this.idPing) {
      this.latensi = Math.max(1, Date.now() - this.pingTerakhir)
    }
    this.pendengar.forEach((f) => f(p))
  }

  kirim(p: Paket) {
    try {
      this.kanal?.postMessage(p)
    } catch {
      /* kanal tertutup */
    }
  }

  langgan(f: (p: Paket) => void) {
    this.pendengar.add(f)
    return () => {
      this.pendengar.delete(f)
    }
  }

  mulaiDenyut() {
    if (!this.kanal) return () => undefined
    const t = window.setInterval(() => {
      this.idPing = `ping_${Date.now()}`
      this.pingTerakhir = Date.now()
      this.kirim({ jenis: 'ping', id: this.idPing, waktu: this.pingTerakhir })
    }, 6000)
    return () => window.clearInterval(t)
  }

  tutup() {
    try {
      this.kanal?.close()
    } catch {
      /* abaikan */
    }
  }
}

export const realtime = new KanalRealtime()

/** Beritahu tab lain bahwa basis data berubah. */
export function siarkanSinkron(aktor = 'sistem') {
  realtime.kirim({ jenis: 'sinkron', waktu: Date.now(), aktor })
}
