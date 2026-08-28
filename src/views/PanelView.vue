<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api/client'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'
import type { Donation, HelpRequest, Product } from '@/types'
import { donationStatusLabel, requestStatusLabel } from '@/types'

const auth = useAuthStore()

const alerts = ref<Product[]>([])
const requests = ref<HelpRequest[]>([])
const readyRequests = ref<HelpRequest[]>([])
const donations = ref<Donation[]>([])
const loading = ref(true)

const showInventory = computed(() => auth.canHandleInventory)

onMounted(async () => {
  try {
    const requestRes = await api.get<HelpRequest[]>('/help-requests')
    requests.value = requestRes.data.filter(
      (item) => item.status === 'recibido' || item.status === 'en_proceso',
    )
    readyRequests.value = requestRes.data.filter((item) => item.status === 'listo')
    if (showInventory.value) {
      const [alertRes, donationRes] = await Promise.all([
        api.get<Product[]>('/inventory/alerts'),
        api.get<Donation[]>('/donations'),
      ])
      alerts.value = alertRes.data
      donations.value = donationRes.data.filter(
        (item) => item.status === 'recibido' || item.status === 'en_proceso',
      )
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section>
    <h1>Panel</h1>
    <p class="lead">Resumen operativo: stock bajo, solicitudes y donaciones pendientes.</p>

    <div v-if="loading">Cargando...</div>
    <div v-else class="grid">
      <article v-if="showInventory" class="card block">
        <div class="head">
          <h2>Alertas de inventario</h2>
          <RouterLink to="/inventario">Ver inventario</RouterLink>
        </div>
        <p v-if="alerts.length === 0">No hay productos por debajo del mínimo.</p>
        <ul>
          <li v-for="product in alerts" :key="product.id">
            <strong>{{ product.name }}</strong>
            <StatusBadge tone="alerta" :label="`${product.quantity} / mín. ${product.minQuantity} ${product.unit}`" />
          </li>
        </ul>
      </article>

      <article class="card block">
        <div class="head">
          <h2>Solicitudes en alistamiento</h2>
          <RouterLink to="/solicitudes">Gestionar</RouterLink>
        </div>
        <p v-if="requests.length === 0">No hay solicitudes pendientes.</p>
        <ul>
          <li v-for="request in requests" :key="request.id">
            <span>
              {{ request.fullName }}
              <small class="muted">— {{ request.assignedTo?.fullName ?? 'sin asignar' }}</small>
            </span>
            <StatusBadge :tone="request.status" :label="requestStatusLabel[request.status]" />
          </li>
        </ul>
      </article>

      <article class="card block">
        <div class="head">
          <h2>Listas para transporte</h2>
          <RouterLink to="/solicitudes">Ver</RouterLink>
        </div>
        <p v-if="readyRequests.length === 0">No hay entregas por despachar.</p>
        <ul>
          <li v-for="request in readyRequests" :key="request.id">
            <span>
              {{ request.fullName }}
              <small class="muted">— {{ request.receptionUser?.fullName ?? 'sin recepción' }}</small>
            </span>
            <StatusBadge tone="listo" :label="requestStatusLabel.listo" />
          </li>
        </ul>
      </article>

      <article v-if="showInventory" class="card block">
        <div class="head">
          <h2>Donaciones por ingresar</h2>
          <RouterLink to="/donaciones">Gestionar</RouterLink>
        </div>
        <p v-if="donations.length === 0">No hay donaciones pendientes.</p>
        <ul>
          <li v-for="donation in donations" :key="donation.id">
            <span>{{ donation.donorName || 'Anónima' }}</span>
            <StatusBadge :tone="donation.status" :label="donationStatusLabel[donation.status]" />
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
h1 {
  font-size: clamp(1.6rem, 7vw, 2.2rem);
}

.lead,
.muted {
  color: var(--ink-soft);
}

.lead {
  margin: 0.3rem 0 1.4rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.block {
  padding: 1.1rem;
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.head a {
  color: var(--terracotta);
  font-weight: 600;
  white-space: nowrap;
}

ul {
  list-style: none;
  display: grid;
  gap: 0.6rem;
}

li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

@media (max-width: 719px) {
  li {
    flex-wrap: wrap;
  }
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .block:first-child {
    grid-column: 1 / -1;
  }
}
</style>
