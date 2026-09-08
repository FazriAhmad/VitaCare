export function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

export function hariIniISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
