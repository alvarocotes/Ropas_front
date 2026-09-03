<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import OverlayCard from '@/components/OverlayCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useLiveReload } from '@/composables/useLiveReload'
import { useAuthStore } from '@/stores/auth'
import type { HelpRequest, Product, RequestStatus } from '@/types'
import { formatHousehold, requestStatusLabel } from '@/types'

type Tab = 'sin-asignar' | 'mias' | 'transporte' | 'todas'

const auth = useAuthStore()

const requests = ref<HelpRequest[]>([])
const products = ref<Product[]>([])
const error = ref('')
const busyId = ref<number | null>(null)
const selected = ref<HelpRequest | null>(null)
const nextStatus = ref<RequestStatus>('en_proceso')
const notes = ref('')
const transportNotes = ref('')
/** Producto y cantidad exacta que se está por añadir al paquete. */
const newItem = ref({ productId: 0, quantity: 1 })
const itemBusy = ref(false)

const isReception = computed(() => auth.isReception)
const isAdmin = computed(() => auth.isAdmin)
const tab = ref<Tab>(auth.isReception ? 'transporte' : 'sin-asignar')

const tabs: { id: Tab; label: string }[] = isReception.value
  ? [
      { id: 'transporte', label: 'Listas para transporte' },
      { id: 'mias', label: 'Mis entregas' },
      { id: 'todas', label: 'Todas' },
    ]
  : [
      { id: 'sin-asignar', label: 'Sin asignar' },
      { id: 'mias', label: 'Mis solicitudes' },
      { id: 'transporte', label: 'En transporte' },
      { id: 'todas', label: 'Todas' },
    ]

/** Estados que el rol actual puede fijar desde el modal. */
const selectableStatuses = computed<RequestStatus[]>(() => {
  if (isAdmin.value) return ['recibido', 'en_proceso', 'listo', 'entregado', 'cancelado']
  if (isReception.value) return ['listo', 'entregado', 'cancelado']
  return ['en_proceso', 'listo', 'cancelado']
})

/** Pasar a listo o entregado exige tener el paquete armado. */
const needsPackage = computed(() => {
  if (!selected.value) return false
  if (nextStatus.value !== 'listo' && nextStatus.value !== 'entregado') return false
  if (nextStatus.value === selected.value.status) return false
  return !selected.value.items?.length
})

const visibleRequests = computed(() => {
  const me = auth.user?.id
  switch (tab.value) {
    case 'sin-asignar':
      return requests.value.filter(
        (item) => !item.assignedToId && item.status !== 'entregado' && item.status !== 'cancelado',
      )
    case 'mias':
      return requests.value.filter((item) =>
        isReception.value ? item.receptionUserId === me : item.assignedToId === me,
      )
    case 'transporte':
      return requests.value.filter((item) => item.status === 'listo')
    default:
      return requests.value
  }
})

function yesNo(value: boolean) {
  return value ? 'Sí' : 'No'
}

function dash(value: string | null | undefined) {
  return value?.trim() ? value : '—'
}

function isClosed(request: HelpRequest) {
  return request.status === 'entregado' || request.status === 'cancelado'
}

function canClaim(request: HelpRequest) {
  if (isReception.value) {
    return request.status === 'listo' && !request.receptionUserId
  }
  return !isClosed(request) && !request.assignedToId
}

function canManage(request: HelpRequest) {
  if (isAdmin.value) return !isClosed(request)
  if (isReception.value) return request.status === 'listo' && request.receptionUserId === auth.user?.id
  return !isClosed(request) && request.assignedToId === auth.user?.id
}

function responsible(request: HelpRequest) {
  if (request.status === 'listo' || request.status === 'entregado') {
    return request.receptionUser?.fullName ?? request.assignedTo?.fullName ?? 'Sin asignar'
  }
  return request.assignedTo?.fullName ?? 'Sin asignar'
}

async function load(opts?: { quiet?: boolean }) {
  try {
    const canSeeInventory = auth.can('inventory')
    // En paralelo para no sumar dos idas y vueltas al servidor.
    const [requestRes, productRes] = await Promise.all([
      api.get<HelpRequest[]>('/help-requests'),
      canSeeInventory ? api.get<Product[]>('/inventory/products').catch(() => null) : null,
    ])
    requests.value = requestRes.data
    products.value = (productRes?.data ?? []).filter((item) => item.isActive)
    if (!newItem.value.productId && products.value[0]) {
      newItem.value.productId = products.value[0].id
    }
  } catch (err) {
    if (!opts?.quiet) error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

useLiveReload(() => load({ quiet: true }), {
  paused: () => Boolean(selected.value) || itemBusy.value || busyId.value !== null,
})

async function claim(request: HelpRequest) {
  error.value = ''
  busyId.value = request.id
  const endpoint = isReception.value ? 'claim-reception' : 'claim'
  try {
    await api.post(`/help-requests/${request.id}/${endpoint}`)
    await load()
    tab.value = 'mias'
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = null
  }
}

async function release(request: HelpRequest) {
  error.value = ''
  busyId.value = request.id
  try {
    await api.post(`/help-requests/${request.id}/release`)
    selected.value = null
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = null
  }
}

/** El paquete lo arma el voluntario asignado, antes de marcar la solicitud como lista. */
function canPreparePackage(request: HelpRequest) {
  if (isClosed(request)) return false
  if (isReception.value) return false
  if (isAdmin.value) return true
  return request.assignedToId === auth.user?.id
}

function stockOf(productId: number | null) {
  if (!productId) return null
  return products.value.find((product) => product.id === productId) ?? null
}

async function addItem() {
  if (!selected.value) return
  if (!newItem.value.productId || newItem.value.quantity < 1) {
    error.value = 'Elige un producto y una cantidad mayor que cero.'
    return
  }
  error.value = ''
  itemBusy.value = true
  try {
    const { data } = await api.post<HelpRequest>(
      `/help-requests/${selected.value.id}/items`,
      { productId: newItem.value.productId, quantity: newItem.value.quantity },
    )
    selected.value = data
    newItem.value.quantity = 1
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    itemBusy.value = false
  }
}

async function setItemQuantity(itemId: number, quantity: number) {
  if (!selected.value || quantity < 1) return
  error.value = ''
  itemBusy.value = true
  try {
    const { data } = await api.patch<HelpRequest>(
      `/help-requests/${selected.value.id}/items/${itemId}`,
      { quantity },
    )
    selected.value = data
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    itemBusy.value = false
  }
}

async function removeItem(itemId: number) {
  if (!selected.value) return
  error.value = ''
  itemBusy.value = true
  try {
    const { data } = await api.delete<HelpRequest>(
      `/help-requests/${selected.value.id}/items/${itemId}`,
    )
    selected.value = data
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    itemBusy.value = false
  }
}

function open(request: HelpRequest) {
  selected.value = request
  nextStatus.value = request.status
  notes.value = request.internalNotes ?? ''
  transportNotes.value = request.transportNotes ?? ''
}

async function save() {
  if (!selected.value) return
  error.value = ''
  if (needsPackage.value) {
    error.value = 'Agrega al menos un producto al paquete antes de marcarla como lista.'
    return
  }
  try {
    await api.patch(`/help-requests/${selected.value.id}`, {
      status: nextStatus.value,
      internalNotes: isReception.value ? undefined : notes.value,
      transportNotes: isReception.value || isAdmin.value ? transportNotes.value : undefined,
    })
    selected.value = null
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}
</script>

<template>
  <section>
    <h1>Solicitudes de ayuda</h1>
    <p class="lead">
      <template v-if="isReception">
        Recepción gestiona el transporte y la entrega de las solicitudes ya alistadas.
      </template>
      <template v-else>
        Toma una solicitud para alistar el paquete. Al marcarla como <strong>lista</strong> pasa a
        recepción para el transporte.
      </template>
    </p>
    <p v-if="error && !selected" class="flash flash-error">{{ error }}</p>

    <div class="tabs">
      <button
        v-for="item in tabs"
        :key="item.id"
        class="tab"
        :class="{ active: tab === item.id }"
        type="button"
        @click="tab = item.id"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Solicitante</th>
            <th>Entrega</th>
            <th>Personas</th>
            <th>Responsable</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="request in visibleRequests" :key="request.id">
            <td data-label="#">{{ request.id }}</td>
            <td data-label="Solicitante">
              <strong>{{ request.fullName }}</strong>
              <span v-if="request.source === 'historial'" class="tag-history">Historial</span>
              <div class="muted">{{ request.phoneWhatsapp }}</div>
            </td>
            <td data-label="Entrega">{{ request.residenceAfter }}</td>
            <td data-label="Personas">{{ formatHousehold(request) }}</td>
            <td data-label="Responsable">{{ responsible(request) }}</td>
            <td data-label="Estado">
              <StatusBadge :tone="request.status" :label="requestStatusLabel[request.status]" />
            </td>
            <td>
              <div class="row-actions">
                <button
                  v-if="canClaim(request)"
                  class="btn btn-primary"
                  type="button"
                  :disabled="busyId === request.id"
                  @click="claim(request)"
                >
                  {{ isReception ? 'Tomar entrega' : 'Tomar solicitud' }}
                </button>
                <button
                  v-if="canManage(request)"
                  class="btn btn-ghost"
                  type="button"
                  @click="open(request)"
                >
                  Gestionar
                </button>
                <button
                  v-else-if="!canClaim(request)"
                  class="btn btn-ghost"
                  type="button"
                  @click="open(request)"
                >
                  Ver
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!visibleRequests.length">
            <td colspan="7" class="muted">No hay solicitudes en esta vista.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <OverlayCard v-if="selected" wide @close="selected = null">
      <h2>Solicitud #{{ selected.id }}</h2>
      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <p class="muted">
        Recibida el {{ new Date(selected.createdAt).toLocaleString('es') }}
      </p>
      <p class="muted">
        Voluntario a cargo: {{ selected.assignedTo?.fullName ?? 'sin asignar' }} · Recepción:
        {{ selected.receptionUser?.fullName ?? 'sin asignar' }}
      </p>

      <dl class="details">
        <div><dt>Nombre</dt><dd>{{ selected.fullName }}</dd></div>
        <div v-if="selected.identificationNumber">
          <dt>Identificación</dt><dd>{{ selected.identificationNumber }}</dd>
        </div>
        <div><dt>WhatsApp</dt><dd>{{ selected.phoneWhatsapp }}</dd></div>
        <div><dt>Residencia antes</dt><dd>{{ selected.residenceBefore }}</dd></div>
        <div><dt>Dirección de entrega</dt><dd>{{ selected.residenceAfter }}</dd></div>
        <div><dt>Afectación</dt><dd>{{ selected.affectationType }}</dd></div>
        <div>
          <dt>Alcance</dt>
          <dd>{{ selected.clothingScope === 'comunidad' ? 'También comunidad' : 'Núcleo familiar' }}</dd>
        </div>
        <div class="wide"><dt>Personas</dt><dd>{{ formatHousehold(selected) }} ({{ selected.peopleCount }})</dd></div>
        <div><dt>Transporte propio</dt><dd>{{ yesNo(selected.hasOwnTransport) }}</dd></div>
        <div><dt>Tallas bebé</dt><dd>{{ dash(selected.babySizes) }}</dd></div>
        <div><dt>Tallas niña</dt><dd>{{ dash(selected.girlShirtSizes) }}</dd></div>
        <div><dt>Tallas mujer</dt><dd>{{ dash(selected.womanShirtSizes) }}</dd></div>
        <div><dt>Tallas niño</dt><dd>{{ dash(selected.boyShirtSizes) }}</dd></div>
        <div><dt>Tallas hombre</dt><dd>{{ dash(selected.manShirtSizes) }}</dd></div>
        <div><dt>Ropa interior</dt><dd>{{ dash(selected.underwearNeeds) }}</dd></div>
        <div><dt>Sábanas, cobijas y toallas</dt><dd>{{ yesNo(selected.needsLinens) }}</dd></div>
        <div><dt>Pañales</dt><dd>{{ yesNo(selected.needsDiapers) }}</dd></div>
        <div v-if="selected.needsDiapers">
          <dt>Etapa de pañal</dt><dd>{{ dash(selected.diaperStage) }}</dd>
        </div>
        <div><dt>Toallas higiénicas</dt><dd>{{ yesNo(selected.needsSanitary) }}</dd></div>
        <div class="wide"><dt>Otras necesidades</dt><dd>{{ dash(selected.additionalNeeds) }}</dd></div>
        <div v-if="selected.internalNotes" class="wide">
          <dt>Notas del alistamiento</dt><dd>{{ selected.internalNotes }}</dd>
        </div>
      </dl>

      <section class="package" :class="{ required: needsPackage }">
        <h3>Paquete a entregar</h3>
        <p class="muted">
          <template v-if="canPreparePackage(selected)">
            Agrega los productos del inventario con la cantidad exacta. El stock se descuenta solo
            cuando recepción marque la solicitud como entregada.
          </template>
          <template v-else>
            Contenido alistado por el voluntario. El stock se descontará al marcar la entrega.
          </template>
        </p>
        <p v-if="needsPackage" class="flash flash-error">
          Para marcarla como {{ requestStatusLabel[nextStatus].toLowerCase() }} necesitas agregar al
          menos un producto al paquete.
        </p>

        <ul v-if="selected.items?.length" class="items">
          <li v-for="item in selected.items" :key="item.id">
            <div class="item-name">
              <strong>{{ item.productName }}</strong>
              <small class="muted">
                Stock disponible: {{ stockOf(item.productId)?.quantity ?? '—' }} {{ item.unit }}
              </small>
            </div>
            <div v-if="canPreparePackage(selected)" class="item-actions">
              <input
                class="qty"
                type="number"
                min="1"
                :value="item.quantity"
                :disabled="itemBusy"
                @change="setItemQuantity(item.id, Number(($event.target as HTMLInputElement).value))"
              />
              <span class="unit">{{ item.unit }}</span>
              <button
                class="btn btn-ghost"
                type="button"
                :disabled="itemBusy"
                @click="removeItem(item.id)"
              >
                Quitar
              </button>
            </div>
            <div v-else class="item-actions">
              <strong>{{ item.quantity }}</strong>
              <span class="unit">{{ item.unit }}</span>
            </div>
          </li>
        </ul>
        <p v-else class="muted empty-items">Todavía no hay productos en el paquete.</p>

        <div v-if="canPreparePackage(selected)" class="add-item">
          <select v-model.number="newItem.productId" aria-label="Producto">
            <option :value="0">Elige un producto…</option>
            <option v-for="product in products" :key="product.id" :value="product.id">
              {{ product.name }} — {{ product.quantity }} {{ product.unit }}
            </option>
          </select>
          <input
            v-model.number="newItem.quantity"
            class="qty"
            type="number"
            min="1"
            aria-label="Cantidad"
          />
          <button
            class="btn btn-forest"
            type="button"
            :disabled="itemBusy"
            @click="addItem"
          >
            Agregar
          </button>
        </div>
      </section>

      <template v-if="canManage(selected)">
        <label class="field">
          <span>Estado</span>
          <select v-model="nextStatus">
            <option v-for="status in selectableStatuses" :key="status" :value="status">
              {{ requestStatusLabel[status] }}
            </option>
          </select>
        </label>
        <label v-if="!isReception" class="field">
          <span>Notas internas (alistamiento)</span>
          <textarea v-model="notes" />
        </label>
        <label v-if="isReception || isAdmin" class="field">
          <span>Notas de transporte</span>
          <textarea v-model="transportNotes" placeholder="Vehículo, conductor, fecha de envío…" />
        </label>
        <p v-if="nextStatus === 'entregado'" class="muted">
          Al guardar se descontarán del inventario los {{ selected.items?.length ?? 0 }} producto(s)
          del paquete.
        </p>
      </template>
      <p v-else class="muted">
        Solo quien tomó la solicitud puede modificarla.
      </p>

      <div class="actions">
        <button class="btn btn-ghost" type="button" @click="selected = null">Cerrar</button>
        <button
          v-if="!isReception && selected.assignedToId && (isAdmin || selected.assignedToId === auth.user?.id) && !isClosed(selected)"
          class="btn btn-ghost"
          type="button"
          @click="release(selected)"
        >
          Liberar
        </button>
        <button
          v-if="canManage(selected)"
          class="btn btn-primary"
          type="button"
          :disabled="needsPackage"
          @click="save"
        >
          Guardar
        </button>
      </div>
    </OverlayCard>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead, .muted { color: var(--ink-soft); }
.tag-history {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: var(--paper);
  border: 1px solid var(--line);
  font-size: 0.72rem;
  color: var(--ink-soft);
}
.card { margin-top: 1rem; padding: 1rem; }
.actions { display: flex; gap: 0.6rem; justify-content: flex-end; flex-wrap: wrap; }
.row-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.tabs {
  display: flex;
  gap: 0.4rem;
  margin-top: 1rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }
.tab {
  flex: 0 0 auto;
  border: 1px solid var(--line);
  background: transparent;
  border-radius: 999px;
  padding: 0.45rem 0.9rem;
  min-height: 40px;
  font: inherit;
  color: var(--ink-soft);
  cursor: pointer;
  white-space: nowrap;
}
.tab.active {
  background: var(--forest);
  border-color: var(--forest);
  color: white;
}
.package {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 0.9rem;
  display: grid;
  gap: 0.6rem;
}

.package.required {
  border-color: var(--alert);
}

.package h3 {
  font-family: var(--display);
  font-size: 1.05rem;
}

.items {
  list-style: none;
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.items li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  flex-wrap: wrap;
  padding: 0.55rem 0.7rem;
  background: var(--paper);
  border-radius: 12px;
}

.item-name {
  display: grid;
  min-width: 0;
}

.item-name strong {
  overflow-wrap: anywhere;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.unit {
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.qty {
  flex: 0 0 80px;
  width: 80px;
  min-height: 44px;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  padding: 0.3rem 0.4rem;
}

.qty::-webkit-outer-spin-button,
.qty::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.add-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px auto;
  gap: 0.45rem;
  align-items: center;
}

.add-item select {
  min-width: 0;
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  padding: 0.4rem 0.6rem;
}

.empty-items {
  margin: 0;
}

@media (max-width: 560px) {
  .add-item {
    grid-template-columns: minmax(0, 1fr) 80px;
  }

  .add-item .btn {
    grid-column: 1 / -1;
  }
}

.details {
  display: grid;
  gap: 0.65rem;
  margin: 0.2rem 0 0.4rem;
}
.details > div {
  display: grid;
  gap: 0.15rem;
}
.details dt {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.details dd {
  margin: 0;
}
@media (min-width: 720px) {
  .details {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .wide {
    grid-column: 1 / -1;
  }
}
@media (max-width: 719px) {
  .actions { flex-direction: column-reverse; }
  .actions .btn { width: 100%; }
}
</style>
