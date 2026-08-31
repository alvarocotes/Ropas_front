<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import OverlayCard from '@/components/OverlayCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useLiveReload } from '@/composables/useLiveReload'
import type { Donation, DonationStatus, Product } from '@/types'
import { donationStatusLabel } from '@/types'

const donations = ref<Donation[]>([])
const products = ref<Product[]>([])
const error = ref('')
const selected = ref<Donation | null>(null)
const nextStatus = ref<DonationStatus>('en_proceso')
const itemMap = ref<Record<number, number | ''>>({})

const statuses: DonationStatus[] = ['recibido', 'en_proceso', 'ingresado', 'cancelado']

async function load(opts?: { quiet?: boolean }) {
  try {
    const [donationRes, productRes] = await Promise.all([
      api.get<Donation[]>('/donations'),
      api.get<Product[]>('/inventory/products'),
    ])
    donations.value = donationRes.data
    products.value = productRes.data.filter((item) => item.isActive)
  } catch (err) {
    if (!opts?.quiet) error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

useLiveReload(() => load({ quiet: true }), {
  paused: () => Boolean(selected.value),
})

function open(donation: Donation) {
  selected.value = donation
  nextStatus.value = donation.status
  itemMap.value = Object.fromEntries(
    donation.items.map((item) => [item.id, item.productId ?? '']),
  )
}

async function save() {
  if (!selected.value) return
  error.value = ''
  try {
    await api.patch(`/donations/${selected.value.id}`, {
      status: nextStatus.value,
      items: selected.value.items.map((item) => ({
        id: item.id,
        productId: itemMap.value[item.id] === '' ? undefined : Number(itemMap.value[item.id]),
      })),
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
    <h1>Donaciones</h1>
    <p class="lead">Al marcar una donación como ingresada, los productos suman al inventario.</p>
    <p v-if="error && !selected" class="flash flash-error">{{ error }}</p>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Donante</th>
            <th>Ítems</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="donation in donations" :key="donation.id">
            <td data-label="#">{{ donation.id }}</td>
            <td data-label="Donante">{{ donation.donorName || 'Anónima' }}</td>
            <td data-label="Ítems">{{ donation.items.map((item) => `${item.productName} (${item.quantity})`).join(', ') }}</td>
            <td data-label="Estado">
              <StatusBadge :tone="donation.status" :label="donationStatusLabel[donation.status]" />
            </td>
            <td>
              <button class="btn btn-ghost" type="button" :disabled="donation.status === 'ingresado' || donation.status === 'cancelado'" @click="open(donation)">
                Gestionar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <OverlayCard v-if="selected" @close="selected = null">
      <h2>Donación #{{ selected.id }}</h2>
      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <p>{{ selected.notes || 'Sin notas' }}</p>
      <div v-for="item in selected.items" :key="item.id" class="map">
        <span>{{ item.productName }} × {{ item.quantity }}</span>
        <select v-model="itemMap[item.id]">
          <option value="">Asociar a producto...</option>
          <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
        </select>
      </div>
      <label class="field">
        <span>Estado</span>
        <select v-model="nextStatus">
          <option v-for="status in statuses" :key="status" :value="status">{{ donationStatusLabel[status] }}</option>
        </select>
      </label>
      <div class="actions">
        <button class="btn btn-ghost" type="button" @click="selected = null">Cerrar</button>
        <button class="btn btn-primary" type="button" @click="save">Guardar</button>
      </div>
    </OverlayCard>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead { color: var(--ink-soft); }
.card { margin-top: 1rem; padding: 1rem; }
.map { display: grid; gap: 0.8rem; }
.map { grid-template-columns: 1fr; align-items: center; }
.actions { display: flex; gap: 0.6rem; justify-content: flex-end; }
@media (min-width: 720px) {
  .map { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}
@media (max-width: 719px) {
  .actions { flex-direction: column-reverse; }
}
</style>
