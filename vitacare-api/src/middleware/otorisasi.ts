import type { NextFunction, Request, Response } from 'express'
import { boleh, type Izin } from '../lib/permissions.js'

export function wajibMasuk(req: Request, res: Response, next: NextFunction) {
  if (!req.aktor) return res.status(401).json({ ok: false, pesan: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' })
  next()
}

export function wajibIzin(izin: Izin) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.aktor) return res.status(401).json({ ok: false, pesan: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' })
    if (!boleh(req.aktor, izin)) return res.status(403).json({ ok: false, pesan: 'Akun Anda tidak memiliki izin untuk tindakan ini.' })
    next()
  }
}
