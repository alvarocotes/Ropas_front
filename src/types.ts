export type UserRole = 'admin' | 'volunteer' | 'reception'

export const roleLabel: Record<UserRole, string> = {
  admin: 'Administrador',
  volunteer: 'Voluntario',
  reception: 'Recepción',
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
  identificationNumber: string
  residenceBefore: string
  residenceAfter: string
  phoneWhatsapp: string
  affectationType: string
  clothingScope: 'familiar' | 'comunidad'
  source?: 'formulario' | 'historial'
  peopleCount: number
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
