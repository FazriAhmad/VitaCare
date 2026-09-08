import { useEffect, useMemo, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { angkaRibuan, cn } from '../lib/utils'

/* ------------------------------------------------------- angka beranimasi */

export function AngkaAnimasi({ nilai, akhiran = '', durasi = 1.1, desimal = 0 }: { nilai: number; akhiran?: string; durasi?: number; desimal?: number }) {
  const mv = useMotionValue(0)
  const teks = useTransform(mv, (v) => (desimal ? v.toFixed(desimal) : angkaRibuan(v)))
  useEffect(() => {
    const kontrol = animate(mv, nilai, { duration: durasi, ease: [0.16, 1, 0.3, 1] })
    return () => kontrol.stop()
  }, [nilai, mv, durasi])
  return (
    <span className="tabular-nums">
      <motion.span>{teks}</motion.span>
      {akhiran}
    </span>
  )
}

/* --------------------------------------------------------- grafik garisan */

interface Titik { label: string; nilai: number }

export function GrafikArea({
  data, tinggi = 190, warna = '#0c8672', warna2 = '#16a58d', format,
}: { data: Titik[]; tinggi?: number; warna?: string; warna2?: string; format?: (n: number) => string }) {
  const [lebar, setLebar] = useState(720)
  const wadah = useMemo(() => ({ ref: (el: HTMLDivElement | null) => {
    if (!el) return
    const ukur = () => setLebar(el.clientWidth || 720)
    ukur()
    window.addEventListener('resize', ukur)
    return () => window.removeEventListener('resize', ukur)
  } }), [])

  const nilaiMax = Math.max(1, ...data.map((d) => d.nilai))
  const padX = 10
  const padY = 16
  const t = tinggi - padY * 2
  const l = lebar - padX * 2
  const langkah = data.length > 1 ? l / (data.length - 1) : l

  const titik = data.map((d, i) => ({
    x: padX + i * langkah,
    y: padY + t - (d.nilai / nilaiMax) * t,
  }))

  const garis = titik.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const sebelum = titik[i - 1]
    const cx = (sebelum.x + p.x) / 2
    return `C ${cx} ${sebelum.y}, ${cx} ${p.y}, ${p.x} ${p.y}`
  }).join(' ')

  const area = `${garis} L ${titik[titik.length - 1]?.x ?? padX} ${tinggi - padY} L ${titik[0]?.x ?? padX} ${tinggi - padY} Z`

  return (
    <div ref={wadah.ref} className="w-full">
      <svg width="100%" height={tinggi} viewBox={`0 0 ${lebar} ${tinggi}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id={`gr_area_${warna.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={warna2} stopOpacity="0.35" />
            <stop offset="100%" stopColor={warna} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={0} x2={lebar} y1={padY + t * f} y2={padY + t * f} stroke="#e8eef3" strokeWidth={1} strokeDasharray="4 6" />
        ))}
        <motion.path
          d={area}
          fill={`url(#gr_area_${warna.replace('#', '')})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        <motion.path
          d={garis}
          fill="none"
          stroke={warna}
          strokeWidth={2.6}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        {titik.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.4}
            fill="#fff"
            stroke={warna}
            strokeWidth={2.4}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.03, type: 'spring', stiffness: 400, damping: 20 }}
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-1">
        {data.map((d, i) => (
          <span key={i} className={cn('text-[10px] font-medium', i === data.length - 1 ? 'text-brand-600' : 'text-ink-400')}>{d.label}</span>
        ))}
      </div>
      {format && (
        <div className="mt-1 flex justify-between px-1 text-[10px] text-ink-300">
          <span>0</span>
          <span>{format(nilaiMax)}</span>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------- grafik batang */

export function GrafikBatang({
  data, tinggiMaks = 170, warna = '#0c8672', format,
}: { data: Titik[]; tinggiMaks?: number; warna?: string; format?: (n: number) => string }) {
  const maks = Math.max(1, ...data.map((d) => d.nilai))
  return (
    <div className="flex items-end gap-2" style={{ height: tinggiMaks + 26 }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.nilai / maks) * tinggiMaks)
        return (
          <div key={i} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="relative flex w-full items-end justify-center" style={{ height: tinggiMaks }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: h }}
                transition={{ delay: i * 0.045, type: 'spring', stiffness: 140, damping: 18 }}
                className="w-full max-w-[46px] rounded-t-lg"
                style={{ background: `linear-gradient(180deg, ${warna}, ${warna}bb)`, opacity: 0.92 }}
              />
              <span className="pointer-events-none absolute -top-6 rounded-md bg-ink-950 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {format ? format(d.nilai) : d.nilai}
              </span>
            </div>
            <span className="w-full truncate text-center text-[10px] font-medium text-ink-400">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ grafik donat */

export function GrafikDonat({ data, ukuran = 168, tebal = 17, pusatAtas, pusatBawah }: {
  data: Array<{ label: string; nilai: number; warna: string }>
  ukuran?: number
  tebal?: number
  pusatAtas?: string
  pusatBawah?: string
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.nilai, 0))
  const r = (ukuran - tebal) / 2
  const keliling = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative" style={{ width: ukuran, height: ukuran }}>
        <svg width={ukuran} height={ukuran} className="-rotate-90">
          <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke="#eef3f6" strokeWidth={tebal} />
          {data.map((d, i) => {
            const bagian = d.nilai / total
            const dash = bagian * keliling
            const el = (
              <motion.circle
                key={i}
                cx={ukuran / 2}
                cy={ukuran / 2}
                r={r}
                fill="none"
                stroke={d.warna}
                strokeWidth={tebal}
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0, dash - 3)} ${keliling}`}
                initial={{ strokeDashoffset: -offset + keliling * 0.02 }}
                animate={{ strokeDashoffset: -offset }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.7, ease: 'easeOut' }}
              />
            )
            offset += dash
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-ink-900"><AngkaAnimasi nilai={total} /></span>
          {pusatBawah && <span className="text-[11px] font-medium text-ink-400">{pusatBawah}</span>}
          {pusatAtas && <span className="text-[11px] font-medium text-ink-400">{pusatAtas}</span>}
        </div>
      </div>
      <ul className="min-w-0 space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.warna }} />
            <span className="text-ink-600">{d.label}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums text-ink-800">{d.nilai}</span>
            <span className="w-10 text-right text-[11px] tabular-nums text-ink-400">{Math.round((d.nilai / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------ peta panas */

export function PetaPanas({ data }: { data: Array<{ jam: string; nilai: number }> }) {
  const maks = Math.max(1, ...data.map((d) => d.nilai))
  return (
    <div className="flex items-end gap-1.5">
      {data.map((d, i) => {
        const intensitas = d.nilai / maks
        return (
          <div key={i} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
            <motion.div
              initial={{ scaleY: 0.2, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
              title={`${d.jam} — ${d.nilai} pasien`}
              className="h-14 w-full rounded-md transition-transform duration-200 group-hover:scale-y-105"
              style={{
                background: `rgba(12, 134, 114, ${0.12 + intensitas * 0.85})`,
                transformOrigin: 'bottom',
              }}
            />
            <span className="text-[9px] font-medium text-ink-400">{d.jam.slice(0, 2)}</span>
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------- progres */

export function Progres({ nilai, maks = 100, warna = '#0c8672', className }: { nilai: number; maks?: number; warna?: string; className?: string }) {
  const persen = Math.max(0, Math.min(100, (nilai / maks) * 100))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-100', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${persen}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full"
        style={{ background: warna }}
      />
    </div>
  )
}

/* ------------------------------------------------------------- pencetus */

export function useTick(ms = 1000) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return tick
}
