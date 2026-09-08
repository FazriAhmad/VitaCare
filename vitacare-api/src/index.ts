import 'dotenv/config'
import { createServer } from 'node:http'
import { app } from './app.js'
import { mulaiRealtime } from './lib/realtime.js'

const server = createServer(app)
mulaiRealtime(server)

const port = Number(process.env.PORT ?? 4010)
server.listen(port, () => console.log(`vitacare-api jalan di http://localhost:${port}`))
