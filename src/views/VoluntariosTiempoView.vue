<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import StatusBadge from '@/components/StatusBadge.vue'
import type { TimeVolunteer, TimeVolunteerStatus } from '@/types'
import {
  formatAvailability,
  isoWeekday,
  timeVolunteerStatusLabel,
  timeVolunteerStatusTone,
  whatsappHref,
} from '@/types'

type Tab = 'nuevos' | 'hoy' | 'todos'

const people = ref<TimeVolunteer[]>([])
const error = ref('')
const flash = ref('')
const tab = ref<Tab>('nuevos')
const selected = ref<TimeVolunteer | null>(null)
const nextStatus = ref<TimeVolunteerStatus>('nuevo')
const staffNotes = ref('')
const saving = ref(false)
const todayIso = isoWeekday()

const statuses: TimeVolunteerStatus[] = ['nuevo', 'contactado', 'confirmado', 'no_disponible']

const visible = computed(() => {
  if (tab.value === 'nuevos') {
    return people.value.filter((item) => item.status === 'nuevo')
  }
  if (tab.value === 'hoy') {
    return people.value.filter(
      (item) =>
        item.status !== 'no_disponible' &&
        item.availability.some((slot) => slot.weekday === todayIso),
    )
  }
  return people.value
})

async function load() {
  try {
    const { data } = await api.get<TimeVolunteer[]>('/time-volunteers')
    people.value = data
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

function open(person: TimeVolunteer) {
  selected.value = person
  nextStatus.value = person.status
  staffNotes.value = person.staffNotes ?? ''
  error.value = ''
  flash.value = ''
}

function todaySlot(person: TimeVolunteer) {
  return person.availability.find((slot) => slot.weekday === todayIso)
}

async function save() {
  if (!selected.value) return
  saving.value = true
  error.value = ''
  try {
    await api.patch(`/time-volunteers/${selected.value.id}`, {
      status: nextStatus.value,
      staffNotes: staffNotes.value.trim() || null,
    })
    selected.value = null
    flash.value = 'Registro actualizado.'
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h1>Voluntarios de tiempo</h1>
        <p class="lead">
          Personas que se registraron en la web para ayudar. Contáctalas y cuadra el día y la hora.
        </p>
      </div>
    </div>

    <p v-if="error" class="flash flash-error">{{ error }}</p>
    <p v-if="flash" class="flash flash-ok">{{ flash }}</p>

    <div class="tabs">
      <button type="button" class="tab" :class="{ active: tab === 'nuevos' }" @click="tab = 'nuevos'">
        Nuevos
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'hoy' }" @click="tab = 'hoy'">
        Pueden hoy
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'todos' }" @click="tab = 'todos'">
        Todos
      </button>
    </div>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Contacto</th>
            <th>Horario</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="person in visible" :key="person.id">
            <td data-label="Nombre">
              <strong>{{ person.fullName }}</strong>
              <div v-if="person.notes" class="muted">{{ person.notes }}</div>
            </td>
            <td data-label="Contacto">
              <a
                v-if="whatsappHref(person.phone)"
                :href="whatsappHref(person.phone)"
                target="_blank"
                rel="noreferrer"
              >
                {{ person.phone }}
              </a>
              <span v-else>{{ person.phone }}</span>
              <div v-if="person.email" class="muted">{{ person.email }}</div>
            </td>
            <td data-label="Horario">
              <template v-if="tab === 'hoy' && todaySlot(person)">
                {{ todaySlot(person)?.startTime }} – {{ todaySlot(person)?.endTime }}
              </template>
              <template v-else>{{ formatAvailability(person.availability) }}</template>
            </td>
            <td data-label="Estado">
              <StatusBadge
                :tone="timeVolunteerStatusTone[person.status]"
                :label="timeVolunteerStatusLabel[person.status]"
              />
            </td>
            <td>
              <button class="btn btn-ghost" type="button" @click="open(person)">Coordinar</button>
            </td>
          </tr>
          <tr v-if="!visible.length">
            <td colspan="5" class="muted">No hay registros en esta vista.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="selected" class="card modal">
      <h2>{{ selected.fullName }}</h2>
      <p class="muted">
        Registrado el {{ new Date(selected.createdAt).toLocaleString('es') }}
      </p>
      <dl class="details">
        <div>
          <dt>WhatsApp</dt>
          <dd>
            <a
              v-if="whatsappHref(selected.phone)"
              :href="whatsappHref(selected.phone)"
              target="_blank"
              rel="noreferrer"
            >
              {{ selected.phone }}
            </a>
            <span v-else>{{ selected.phone }}</span>
          </dd>
        </div>
        <div v-if="selected.email"><dt>Correo</dt><dd>{{ selected.email }}</dd></div>
        <div class="wide"><dt>Horario</dt><dd>{{ formatAvailability(selected.availability) }}</dd></div>
        <div v-if="selected.notes" class="wide"><dt>Quiere ayudar en</dt><dd>{{ selected.notes }}</dd></div>
      </dl>

      <form class="form" @submit.prevent="save">
        <label class="field">
          <span>Estado</span>
          <select v-model="nextStatus">
            <option v-for="status in statuses" :key="status" :value="status">
              {{ timeVolunteerStatusLabel[status] }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>Notas del equipo (quién llamó, a qué hora queda, etc.)</span>
          <textarea v-model="staffNotes" />
        </label>
        <div class="form-actions">
          <button class="btn btn-ghost" type="button" @click="selected = null">Cerrar</button>
          <button class="btn btn-primary" type="submit" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
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
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.8rem 0 1rem;
}
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
}
.tab.active {
  background: var(--forest);
  border-color: var(--forest);
  color: white;
}
.details {
  display: grid;
  gap: 0.7rem;
  margin: 1rem 0;
}
.details > div {
  display: grid;
  gap: 0.15rem;
}
.details dt {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
.form {
  display: grid;
  gap: 0.8rem;
}
.modal {
  margin-top: 1rem;
  padding: 1.1rem;
}
</style>
