export type UserRole = 'admin' | 'volunteer' | 'reception'

export const roleLabel: Record<UserRole, string> = {
  admin: 'Administrador',
  volunteer: 'Voluntario',
  reception: 'Recepción',
}

export type AppModule =
  | 'inventory'
  | 'donations'
  | 'requests'
  | 'needs'
  | 'content'
  | 'time_volunteers'
  | 'shift_log'

export const MODULE_OPTIONS: { id: AppModule; label: string; short: string }[] = [
  { id: 'inventory', label: 'Inventario y movimientos', short: 'Inventario' },
  { id: 'donations', label: 'Donaciones', short: 'Donaciones' },
  { id: 'requests', label: 'Solicitudes de ayuda', short: 'Solicitudes' },
  { id: 'needs', label: 'Necesidades públicas', short: 'Necesidades' },
  { id: 'content', label: 'Contenido (quiénes somos y mapa)', short: 'Contenido' },
  { id: 'time_volunteers', label: 'Registro de voluntarios', short: 'Voluntarios' },
  { id: 'shift_log', label: 'Bitácora por turno', short: 'Bitácora' },
]

export function defaultModulesForRole(role: UserRole): AppModule[] {
  if (role === 'admin') return MODULE_OPTIONS.map((item) => item.id)
  if (role === 'reception') return ['requests', 'time_volunteers', 'shift_log']
  return ['inventory', 'donations', 'requests', 'needs', 'shift_log']
}

export function formatModules(modules?: AppModule[], role?: UserRole): string {
  if (role === 'admin') return 'Todos'
  const ids = modules?.length ? modules : []
  if (!ids.length) return 'Ninguno'
  return ids
    .map((id) => MODULE_OPTIONS.find((item) => item.id === id)?.short ?? id)
    .join(' · ')
}

export interface UserRef {
  id: number
  fullName: string
}

export type RequestStatus = 'recibido' | 'en_proceso' | 'listo' | 'entregado' | 'cancelado'

export type DonationStatus = 'recibido' | 'en_proceso' | 'ingresado' | 'cancelado'

export type MovementType = 'entrada' | 'salida'

export interface User {
  id: number
  email: string
  role: UserRole
  fullName: string
  phone: string | null
  isActive: boolean
  createdAt: string
  modules?: AppModule[]
  availability?: AvailabilitySlot[]
  attendances?: AttendanceRecord[]
}

export interface AvailabilitySlot {
  weekday: number
  startTime: string
  endTime: string
}

export interface AttendanceRecord {
  id: number
  date: string
  startTime: string
  endTime: string
}

export interface ShiftLog {
  id: number
  userId: number
  authorName: string
  workDate: string
  startTime: string
  endTime: string
  summary: string
  followUp: string
  createdAt: string
  updatedAt: string
}

export interface VolunteerSchedule {
  id: number
  fullName: string
  availability: AvailabilitySlot[]
}

export interface StaffAttendance {
  id: number
  userId: number
  fullName: string
  role: UserRole
  date: string
  startTime: string
  endTime: string
}

export const WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
]

export function isoWeekday(date = new Date()): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function formatAvailability(slots?: AvailabilitySlot[]): string {
  if (!slots?.length) return 'Sin horario'
  return [...slots]
    .sort((a, b) => a.weekday - b.weekday)
    .map((slot) => {
      const day = WEEKDAYS.find((item) => item.value === slot.weekday)
      return `${day?.short ?? slot.weekday} ${slot.startTime}–${slot.endTime}`
    })
    .join(' · ')
}

/** Fecha local YYYY-MM-DD, sin UTC. */
export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatWorkDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Próximas fechas de asistencia (hoy en adelante), para listados. */
export function formatAttendances(rows?: AttendanceRecord[], fromDate = localIsoDate()): string {
  const upcoming = [...(rows ?? [])]
    .filter((row) => row.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  if (!upcoming.length) return 'Sin fechas'
  return upcoming
    .slice(0, 4)
    .map((row) => `${formatWorkDate(row.date)} ${row.startTime}–${row.endTime}`)
    .join(' · ')
}

export function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  const intl = digits.length === 10 ? `57${digits}` : digits
  return `https://wa.me/${intl}`
}

export type TimeVolunteerStatus = 'nuevo' | 'contactado' | 'confirmado' | 'no_disponible'

export const timeVolunteerStatusLabel: Record<TimeVolunteerStatus, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  confirmado: 'Confirmado',
  no_disponible: 'No disponible',
}

export const timeVolunteerStatusTone: Record<
  TimeVolunteerStatus,
  'recibido' | 'en_proceso' | 'listo' | 'cancelado'
> = {
  nuevo: 'recibido',
  contactado: 'en_proceso',
  confirmado: 'listo',
  no_disponible: 'cancelado',
}

export type TimeVolunteerHelpType = 'sede' | 'transporte'
export type VehicleKind = 'moto' | 'carro' | 'camioneta' | 'otro'

export const helpTypeLabel: Record<TimeVolunteerHelpType, string> = {
  sede: 'En la sede',
  transporte: 'Transporte',
}

export const vehicleKindLabel: Record<VehicleKind, string> = {
  moto: 'Moto',
  carro: 'Carro',
  camioneta: 'Camioneta',
  otro: 'Otro',
}

export interface TimeVolunteer {
  id: number
  fullName: string
  phone: string
  email: string | null
  notes: string | null
  staffNotes: string | null
  helpType?: TimeVolunteerHelpType
  hasVehicle: boolean
  vehicleType: VehicleKind | null
  vehicleInfo: string | null
  status: TimeVolunteerStatus
  createdAt: string
  availability: AvailabilitySlot[]
}

export type ClothingAudience = 'woman' | 'man' | 'girl' | 'boy' | 'baby'

export type ClothingGarment = 'superior' | 'inferior'

export type ClothingSizeOffer = { label: string; sizes: string[] }

export type ClothingSizes = Record<ClothingAudience, ClothingSizeOffer[]>

export const clothingAudienceLabel: Record<ClothingAudience, string> = {
  woman: 'Mujer',
  man: 'Hombre',
  girl: 'Niña',
  boy: 'Niño',
  baby: 'Bebé',
}

export const REQUEST_LABEL_SUGGESTIONS = [
  'Blusa',
  'Camisa hombre',
  'Camisa niño',
  'Inferior',
  'Pantalón',
  'Short',
  'Body',
]

export const clothingGarmentLabel: Record<ClothingGarment, string> = {
  superior: 'Superior',
  inferior: 'Inferior',
}

export function garmentPartLabel(audience: ClothingAudience, garment: ClothingGarment): string {
  if (garment === 'inferior') return 'Inferior'
  if (audience === 'man') return 'Camisa hombre'
  if (audience === 'boy') return 'Camisa niño'
  if (audience === 'baby') return 'Superior'
  return 'Blusa'
}

export interface Product {
  id: number
  name: string
  unit: string
  quantity: number
  minQuantity: number
  isActive: boolean
  publishWhenLow: boolean
  publicNote: string | null
  audience?: ClothingAudience | null
  garment?: ClothingGarment | null
  requestLabel?: string | null
  sizeLabel?: string | null
}

export interface InventoryMovement {
  id: number
  productId: number
  type: MovementType
  quantity: number
  note: string | null
  createdAt: string
  product?: Product
  user?: { id: number; fullName: string } | null
}

export interface DonationItem {
  id: number
  productId: number | null
  productName: string
  quantity: number
  unit: string
}

export interface Donation {
  id: number
  donorName: string | null
  contact: string | null
  status: DonationStatus
  notes: string | null
  items: DonationItem[]
  createdAt: string
}

export interface HelpRequestItem {
  id: number
  productId: number | null
  productName: string
  quantity: number
  unit: string
  product?: Product | null
}

export interface HelpRequest {
  id: number
  fullName: string
  identificationNumber?: string
  residenceBefore: string
  residenceAfter: string
  phoneWhatsapp: string
  affectationType: string
  clothingScope: 'familiar' | 'comunidad'
  source?: 'formulario' | 'historial'
  peopleCount: number
  womenCount: number
  menCount: number
  girlsCount: number
  boysCount: number
  babiesCount: number
  hasOwnTransport: boolean
  babySizes: string | null
  girlShirtSizes: string | null
  girlPantsSizes: string | null
  womanShirtSizes: string | null
  womanPantsSizes: string | null
  boyShirtSizes: string | null
  boyPantsSizes: string | null
  manShirtSizes: string | null
  manPantsSizes: string | null
  underwearNeeds: string | null
  needsLinens: boolean
  needsDiapers: boolean
  diaperStage: string | null
  needsSanitary: boolean
  additionalNeeds: string | null
  status: RequestStatus
  internalNotes: string | null
  assignedToId: number | null
  assignedTo: UserRef | null
  receptionUserId: number | null
  receptionUser: UserRef | null
  transportNotes: string | null
  items: HelpRequestItem[]
  readyAt: string | null
  deliveredAt: string | null
  createdAt: string
}

function countLabel(count: number, singular: string, plural: string) {
  if (count <= 0) return ''
  return `${count} ${count === 1 ? singular : plural}`
}

/** Desglose de personas de una solicitud (mujeres, hombres, niñas, niños, bebés). */
export function formatHousehold(request: {
  peopleCount: number
  womenCount?: number | null
  menCount?: number | null
  girlsCount?: number | null
  boysCount?: number | null
  babiesCount?: number | null
}): string {
  const parts = [
    countLabel(request.womenCount ?? 0, 'mujer', 'mujeres'),
    countLabel(request.menCount ?? 0, 'hombre', 'hombres'),
    countLabel(request.girlsCount ?? 0, 'niña', 'niñas'),
    countLabel(request.boysCount ?? 0, 'niño', 'niños'),
    countLabel(request.babiesCount ?? 0, 'bebé', 'bebés'),
  ].filter(Boolean)
  if (!parts.length) {
    return `${request.peopleCount} persona${request.peopleCount === 1 ? '' : 's'}`
  }
  return parts.join(', ')
}

/** Une camisas y pantalones en una sola lista de tallas cuando coinciden. */
export function formatClothingSizes(shirt?: string | null, pants?: string | null): string {
  const a = (shirt ?? '').trim()
  const b = (pants ?? '').trim()
  if (a && b && a !== b) return `${a} · ${b}`
  return a || b
}

export interface PublicNeed {
  id: number
  productId: number | null
  product?: Product | null
  title: string
  quantityNeeded: number
  message: string | null
  isVisible: boolean
  /** `inventario` = publicada automáticamente por stock bajo. */
  source?: 'manual' | 'inventario'
}

export interface AboutSection {
  id: number
  sectionKey: string
  title: string
  body: string
  position: number
  isVisible: boolean
}

export interface ImpactPoint {
  id: number
  label: string
  latitude: number
  longitude: number
  peopleHelped: number
  itemsDelivered: number
}

export interface Impact {
  peopleHelped: number
  familiesHelped: number
  itemsDelivered: number
  activeVolunteers: number
  zonesCovered: number
  points: ImpactPoint[]
}

export const requestStatusLabel: Record<RequestStatus, string> = {
  recibido: 'Recibido',
  en_proceso: 'En proceso',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const donationStatusLabel: Record<DonationStatus, string> = {
  recibido: 'Recibido',
  en_proceso: 'En proceso',
  ingresado: 'Ingresado',
  cancelado: 'Cancelado',
}

export const movementTypeLabel: Record<MovementType, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
}
