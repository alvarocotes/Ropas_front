<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api/client'
import StatusBadge from '@/components/StatusBadge.vue'
import { useLiveReload } from '@/composables/useLiveReload'
import { useAuthStore } from '@/stores/auth'
import type { Donation, HelpRequest, Product, StaffAttendance, TimeVolunteer } from '@/types'
import { donationStatusLabel, isoWeekday, localIsoDate, requestStatusLabel, roleLabel } from '@/types'

const auth = useAuthStore()

const alerts = ref<Product[]>([])
const requests = ref<HelpRequest[]>([])
const readyRequests = ref<HelpRequest[]>([])
const donations = ref<Donation[]>([])
const schedule = ref<StaffAttendance[]>([])
const timeVolunteers = ref<TimeVolunteer[]>([])
const loading = ref(true)

const showInventory = computed(() => auth.can('inventory'))
const showDonations = computed(() => auth.can('donations'))
const showRequests = computed(() => auth.can('requests'))
const canManageTransport = computed(() => auth.can('time_volunteers'))
const today = localIsoDate()
const todayIso = isoWeekday()
const newTimeVolunteers = computed(() =>
  timeVolunteers.value.filter((item) => item.status === 'nuevo'),
)
const todayTimeVolunteers = computed(() =>
  timeVolunteers.value
    .map((person) => ({
      ...person,
      slot: person.availability.find((item) => item.weekday === todayIso),
    }))
    .filter((person) => person.slot && person.status !== 'no_disponible'),
)

onMounted(() => {
  void load()
})

useLiveReload(() => load({ quiet: true }))

async function load(opts?: { quiet?: boolean }) {
  try {
    // Todo en paralelo: en producción cada ida y vuelta al servidor cuesta.
    const [requestRes, alertRes, donationRes, scheduleRes, timeRes] = await Promise.all([
      showRequests.value ? api.get<HelpRequest[]>('/help-requests') : null,
      showInventory.value ? api.get<Product[]>('/inventory/alerts') : null,
      showDonations.value ? api.get<Donation[]>('/donations') : null,
      api.get<StaffAttendance[]>('/stats/staff-attendance', { params: { date: today } }),
      canManageTransport.value ? api.get<TimeVolunteer[]>('/time-volunteers') : null,
    ])
    requests.value = (requestRes?.data ?? []).filter(
      (item) => item.status === 'recibido' || item.status === 'en_proceso',
    )
    readyRequests.value = (requestRes?.data ?? []).filter((item) => item.status === 'listo')
    alerts.value = alertRes?.data ?? []
    donations.value = (donationRes?.data ?? []).filter(
      (item) => item.status === 'recibido' || item.status === 'en_proceso',
    )
    schedule.value = scheduleRes?.data ?? []
    timeVolunteers.value = timeRes?.data ?? []
  } catch {
    if (!opts?.quiet) {
      /* el panel no muestra un error global; las tarjetas quedan vacías */
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section>
    <h1>Panel</h1>
    <p class="lead">Resumen operativo: stock bajo, solicitudes y donaciones pendientes.</p>

    <div v-if="loading">Cargando...</div>
    <div v-else class="grid">
      <article class="card block">
        <div class="head">
          <h2>Equipo hoy</h2>
          <RouterLink to="/horario">Mi horario</RouterLink>
        </div>
        <p v-if="schedule.length === 0">Nadie registró una fecha para hoy.</p>
        <ul>
          <li v-for="person in schedule" :key="person.id">
            <span>
              {{ person.fullName }}
              <small class="muted">— {{ roleLabel[person.role] }}</small>
            </span>
            <StatusBadge tone="listo" :label="`${person.startTime} – ${person.endTime}`" />
          </li>
        </ul>
      </article>

      <article v-if="canManageTransport" class="card block">
        <div class="head">
          <h2>Registro de voluntarios</h2>
          <RouterLink to="/voluntarios-tiempo">Ver registro</RouterLink>
        </div>
        <p v-if="newTimeVolunteers.length">
          {{ newTimeVolunteers.length }} persona{{ newTimeVolunteers.length === 1 ? '' : 's' }}
          nueva{{ newTimeVolunteers.length === 1 ? '' : 's' }} por contactar.
        </p>
        <p v-else-if="todayTimeVolunteers.length === 0">Nadie del registro marcó horario para hoy.</p>
        <ul v-if="todayTimeVolunteers.length">
          <li v-for="person in todayTimeVolunteers" :key="person.id">
            <span>
              {{ person.fullName }}
              <small class="muted">— {{ person.phone }}</small>
            </span>
            <StatusBadge tone="listo" :label="`${person.slot?.startTime} – ${person.slot?.endTime}`" />
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

      <article v-if="showRequests" class="card block">
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

      <article v-if="showRequests" class="card block">
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

      <article v-if="showDonations" class="card block">
        <div class="head">
          <h2>Donaciones por ingresar</h2>
          <RouterLink to="/donaciones">Gestionar</RouterLink>
        </div>
        <p v-if="donations.length === 0">No hay donaciones pendientes.</p>
        <ul>
          <li v-for="donation in donations" :key="donation.id">
            <span>
              {{ donation.donorName || 'Anónima' }}
              <small v-if="donation.contact" class="muted">— {{ donation.contact }}</small>
            </span>
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
