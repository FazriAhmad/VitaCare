import jwt from 'jsonwebtoken'

const SECRET: string = (() => {
  const v = process.env.JWT_SECRET
  if (!v) throw new Error('JWT_SECRET belum diset di .env')
  return v
})()

const MASA_BERLAKU = '12h'

export function terbitkanToken(penggunaId: string): string {
  return jwt.sign({ sub: penggunaId }, SECRET, { expiresIn: MASA_BERLAKU })
}

export function verifikasiToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET)
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
