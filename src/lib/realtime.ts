/**
 * Lapisan realtime VitaCare — koneksi WebSocket sungguhan ke vitacare-api
 * (menggantikan simulasi BroadcastChannel dari versi localStorage/Fase 1).
 * Setiap mutasi di server memancarkan event `perubahan`; di sini kita cuma
 * meneruskannya sebagai sinyal "muat ulang" — lihat db.ts `mulaiSinkronisasi`.
 */
import { io, type Socket } from 'socket.io-client'

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4010/api'
const URL_SOKET = API.replace(/\/api\/?$/, '')
const JEDA_DENYUT = 5000

class KanalRealtime {
  private socket: Socket
  private pendengarPerubahan = new Set<() => void>()
  private pendengarStatus = new Set<() => void>()
  private pingTerakhir = 0

  latensi = 0
  tersambung = false

  constructor() {
    this.socket = io(URL_SOKET, { reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 8000 })

    this.socket.on('connect', () => {
      this.tersambung = true
      this.sebarStatus()
    })
    this.socket.on('disconnect', () => {
      this.tersambung = false
      this.latensi = 0
      this.sebarStatus()
    })
    this.socket.on('perubahan', () => this.pendengarPerubahan.forEach((f) => f()))
    this.socket.on('pong', (waktuKirim: number) => {
      this.latensi = Math.max(1, Date.now() - waktuKirim)
      this.sebarStatus()
    })

    window.setInterval(() => {
      if (this.socket.connected) {
        this.pingTerakhir = Date.now()
        this.socket.emit('ping', this.pingTerakhir)
      }
    }, JEDA_DENYUT)
  }

  private sebarStatus() { this.pendengarStatus.forEach((f) => f()) }

  /** Berlangganan sinyal "ada perubahan data di server" — panggil muat ulang di sini. */
  langgan(f: () => void) {
    this.pendengarPerubahan.add(f)
    return () => { this.pendengarPerubahan.delete(f) }
  }

  langganStatus(f: () => void) {
    this.pendengarStatus.add(f)
    return () => { this.pendengarStatus.delete(f) }
  }
}

export const realtime = new KanalRealtime()
