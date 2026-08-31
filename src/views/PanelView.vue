<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api/client'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'
import type { Donation, HelpRequest, Product, VolunteerSchedule } from '@/types'
import { donationStatusLabel, isoWeekday, requestStatusLabel } from '@/types'

const auth = useAuthStore()

const alerts = ref<Product[]>([])
const requests = ref<HelpRequest[]>([])
const readyRequests = ref<HelpRequest[]>([])
const donations = ref<Donation[]>([])
const schedule = ref<VolunteerSchedule[]>([])
const loading = ref(true)

const showInventory = computed(() => auth.canHandleInventory)
const todayIso = isoWeekday()
const todayVolunteers = computed(() =>
  schedule.value
    .map((volunteer) => ({
      ...volunteer,
      slot: volunteer.availability.find((item) => item.weekday === todayIso),
    }))
    .filter((volunteer) => volunteer.slot),
)

onMounted(async () => {
  try {
    // Todo en paralelo: en producción cada ida y vuelta al servidor cuesta.
    const [requestRes, alertRes, donationRes, scheduleRes] = await Promise.all([
      api.get<HelpRequest[]>('/help-requests'),
      showInventory.value ? api.get<Product[]>('/inventory/alerts') : null,
      showInventory.value ? api.get<Donation[]>('/donations') : null,
      api.get<VolunteerSchedule[]>('/stats/volunteer-schedule'),
    ])
    requests.value = requestRes.data.filter(
      (item) => item.status === 'recibido' || item.status === 'en_proceso',
    )
    readyRequests.value = requestRes.data.filter((item) => item.status === 'listo')
    alerts.value = alertRes?.data ?? []
    donations.value = (donationRes?.data ?? []).filter(
      (item) => item.status === 'recibido' || item.status === 'en_proceso',
    )
    schedule.value = scheduleRes.data
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
      <article class="card block">
        <div class="head">
          <h2>Voluntarios hoy</h2>
          <RouterLink v-if="auth.isAdmin" to="/usuarios">Ver horarios</RouterLink>
          <RouterLink v-else-if="auth.user?.role === 'volunteer'" to="/perfil">Mi horario</RouterLink>
        </div>
        <p v-if="todayVolunteers.length === 0">Nadie registró horario para hoy.</p>
        <ul>
          <li v-for="volunteer in todayVolunteers" :key="volunteer.id">
            <span>{{ volunteer.fullName }}</span>
            <StatusBadge
              tone="listo"
              :label="`${volunteer.slot?.startTime} – ${volunteer.slot?.endTime}`"
            />
          </li>
        </ul>
      </article>
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
