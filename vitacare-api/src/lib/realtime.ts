import type { Server as HttpServer } from 'node:http'
import { Server as SocketServer } from 'socket.io'

let io: SocketServer | undefined

/**
 * Satu kanal siaran global, bukan ruang per cabang. Untuk skala klinik target
 * PRD (puluhan cabang) beban siaran ini masih kecil — ponytail: kalau nanti
 * jumlah cabang & lalu lintas jauh lebih besar, pisahkan jadi io.to(cabangId).
 */
export function mulaiRealtime(server: HttpServer): SocketServer {
  io = new SocketServer(server, { cors: { origin: true } })
  io.on('connection', (socket) => {
    socket.on('ping', (waktuKirim: number) => socket.emit('pong', waktuKirim))
  })
  return io
}

/** Beri tahu semua klien bahwa ada perubahan data. Dipanggil dari catat() setiap mutasi. */
export function siarkanPerubahan() {
  io?.emit('perubahan')
}
