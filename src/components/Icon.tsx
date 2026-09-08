import { useState } from 'react'
import {
  Activity, AlertCircle, ArrowRight, Award, Baby, Bell, Building2, Calendar, Check, ChevronDown, ChevronLeft,
  ChevronRight, ClipboardList, Clock, Download, Droplets, Ear, Eye, FileText, Filter, Heart,
  History, Info, Layers, LayoutDashboard, LayoutGrid, LogIn, LogOut, Mail, MapPin, Menu, Pencil,
  Phone, Plus, Printer, QrCode, RefreshCw, Search, Settings, Shield, Star, Stethoscope, Ticket,
  Trash2, TrendingUp, Tv, Truck, User, Users, Volume2, VolumeX, X, Zap,
} from 'lucide-react'
import { cn } from '../lib/utils'

/**
 * Ikon bercadar Flat Icon (CDN) dengan fallback otomatis ke SVG garis bila
 * berkas CDN tidak dapat dimuat — tampilan tetap konsisten dan tidak kosong.
 */
const CDN: Record<string, string> = {
  rumah_sakit: 'https://cdn-icons-png.flaticon.com/512/2920/2920277.png',
  stetoskop: 'https://cdn-icons-png.flaticon.com/512/125/125248.png',
  kalender: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
  keluarga: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
  pil: 'https://cdn-icons-png.flaticon.com/512/1995/1995574.png',
  jantung: 'https://cdn-icons-png.flaticon.com/512/2991/2991114.png',
  qr: 'https://cdn-icons-png.flaticon.com/512/4225/4225755.png',
  dokter: 'https://cdn-icons-png.flaticon.com/512/3737/3737713.png',
  pengguna: 'https://cdn-icons-png.flaticon.com/512/747/747312.png',
  centang: 'https://cdn-icons-png.flaticon.com/512/1828/1828640.png',
  gedung: 'https://cdn-icons-png.flaticon.com/512/2799/2799796.png',
  gigi: 'https://cdn-icons-png.flaticon.com/512/5960/5960387.png',
  ambulans: 'https://cdn-icons-png.flaticon.com/512/125/125249.png',
  bedah: 'https://cdn-icons-png.flaticon.com/512/4147/4147142.png',
  folder: 'https://cdn-icons-png.flaticon.com/512/3004/3004458.png',
  avatar: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
  tiket: 'https://cdn-icons-png.flaticon.com/512/2920/2920325.png',
  pasien: 'https://cdn-icons-png.flaticon.com/512/2913/2913136.png',
  layar: 'https://cdn-icons-png.flaticon.com/512/5946/5946081.png',
  grafik: 'https://cdn-icons-png.flaticon.com/512/6593/6593748.png',
}

type IkonCabang =
  | 'rumah_sakit' | 'stetoskop' | 'kalender' | 'keluarga' | 'pil' | 'jantung' | 'qr' | 'dokter'
  | 'pengguna' | 'centang' | 'gedung' | 'gigi' | 'ambulans' | 'bedah' | 'folder' | 'avatar'
  | 'tiket' | 'pasien' | 'layar' | 'grafik'

const CADANGAN: Record<string, React.ComponentType<{ size?: number | string; strokeWidth?: number; className?: string }>> = {
  stetoskop: Stethoscope, keluarga: Baby, gigi: Droplets, hamil: Heart, jantung: Activity, mata: Eye,
  tht: Ear, kulit: Droplets, saraf: Zap, ambulans: Truck, dashboard: LayoutDashboard, daftar: ClipboardList,
  pengguna: Users, dokter: Stethoscope, poli: Layers, jadwal: Calendar, cabang: Building2, laporan: FileText,
  audit: Shield, privasi: Shield, analitik: TrendingUp, tv: Tv, qr: QrCode, notifikasi: Bell, keluar: LogOut, masuk: LogIn,
  tambah: Plus, edit: Pencil, hapus: Trash2, cari: Search, filter: Filter, unduh: Download, cetak: Printer,
  centang: Check, tutup: X, panah: ArrowRight, bawah: ChevronDown, kiri: ChevronLeft, kanan: ChevronRight,
  suara: Volume2, bisu: VolumeX, setelan: Settings, segarkan: RefreshCw, jam: Clock, lokasi: MapPin,
  telepon: Phone, mail: Mail, riwayat: History, pengumuman: Award, bintang: Star, info: Info,
  peringatan: AlertCircle, sukses: Check, tiket: Ticket, rumah_sakit: Heart, gedung: Building2,
  avatar: User, pasien: User, layar: Tv, grafik: TrendingUp, pil: Activity, bedah: Activity,
  menu: Menu, batal: X, kotak: LayoutGrid,
}

export interface IkonProps {
  nama: IkonCabang | string
  ukuran?: number
  className?: string
  warna?: string
}

export function Ikon({ nama, ukuran = 20, className, warna }: IkonProps) {
  const [gagal, setGagal] = useState(false)
  const sumber = CDN[nama]

  if (sumber && !gagal) {
    return (
      <img
        src={sumber}
        alt=""
        width={ukuran}
        height={ukuran}
        loading="lazy"
        onError={() => setGagal(true)}
        className={cn('shrink-0 select-none object-contain', className)}
        style={{ width: ukuran, height: ukuran, filter: warna ? `drop-shadow(0 0 0 ${warna})` : undefined }}
      />
    )
  }

  const Komp = CADANGAN[nama] ?? Activity
  return <Komp size={ukuran} className={cn('shrink-0', className)} strokeWidth={1.9} />
}

export const IKON_POLI: Record<string, string> = {
  poli_umu: 'stetoskop',
  poli_ank: 'keluarga',
  poli_gig: 'gigi',
  poli_kan: 'hamil',
  poli_jan: 'jantung',
  poli_mat: 'mata',
  poli_tht: 'tht',
  poli_kul: 'kulit',
  poli_sar: 'saraf',
  poli_igd: 'ambulans',
}
