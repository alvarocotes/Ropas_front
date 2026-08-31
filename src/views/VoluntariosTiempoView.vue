<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import StatusBadge from '@/components/StatusBadge.vue'
import type { AvailabilitySlot, TimeVolunteer, TimeVolunteerHelpType, TimeVolunteerStatus, VehicleKind } from '@/types'
import {
  formatAvailability,
  helpTypeLabel,
  isoWeekday,
  timeVolunteerStatusLabel,
  timeVolunteerStatusTone,
  vehicleKindLabel,
  WEEKDAYS,
  whatsappHref,
} from '@/types'

type Tab = 'nuevos' | 'hoy' | 'sede' | 'transporte' | 'todos'

type DayDraft = {
  weekday: number
  label: string
  enabled: boolean
  startTime: string
  endTime: string
}

const people = ref<TimeVolunteer[]>([])
const error = ref('')
const flash = ref('')
const tab = ref<Tab>('nuevos')
const selected = ref<TimeVolunteer | null>(null)
const nextStatus = ref<TimeVolunteerStatus>('nuevo')
const staffNotes = ref('')
const saving = ref(false)
const showCreate = ref(false)
const todayIso = isoWeekday()

const statuses: TimeVolunteerStatus[] = ['nuevo', 'contactado', 'confirmado', 'no_disponible']

const createForm = reactive({
  helpType: 'transporte' as TimeVolunteerHelpType,
  fullName: '',
  phone: '',
  email: '',
  vehicleType: '' as VehicleKind | '',
  vehicleInfo: '',
  notes: '',
})

function emptyWeek(): DayDraft[] {
  return WEEKDAYS.map((day) => ({
    weekday: day.value,
    label: day.label,
    enabled: false,
    startTime: '08:00',
    endTime: '12:00',
  }))
}

const createDays = ref<DayDraft[]>(emptyWeek())

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
  if (tab.value === 'sede' || tab.value === 'transporte') {
    return people.value.filter((item) => (item.helpType ?? 'transporte') === tab.value)
  }
  return people.value
})

function toHm(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  const hours = match?.[1]
  const minutes = match?.[2]
  if (!hours || !minutes) return '08:00'
  return `${hours.padStart(2, '0')}:${minutes}`
}

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
  showCreate.value = false
  error.value = ''
  flash.value = ''
}

function todaySlot(person: TimeVolunteer) {
  return person.availability.find((slot) => slot.weekday === todayIso)
}

function vehicleLabel(person: TimeVolunteer) {
  if ((person.helpType ?? 'transporte') !== 'transporte') return '—'
  if (person.vehicleType) {
    const kind = vehicleKindLabel[person.vehicleType]
    return person.vehicleInfo?.trim() ? `${kind} (${person.vehicleInfo})` : kind
  }
  if (!person.hasVehicle) return 'Sin vehículo'
  return person.vehicleInfo?.trim() ? person.vehicleInfo : 'Con vehículo'
}

function cancelCreate() {
  showCreate.value = false
  createForm.helpType = 'transporte'
  createForm.fullName = ''
  createForm.phone = ''
  createForm.email = ''
  createForm.vehicleType = ''
  createForm.vehicleInfo = ''
  createForm.notes = ''
  createDays.value = emptyWeek()
}

async function createPerson() {
  error.value = ''
  if (createForm.fullName.trim().length < 2) {
    error.value = 'Escribe el nombre.'
    return
  }
  if (createForm.phone.trim().length < 7) {
    error.value = 'Escribe un celular de contacto.'
    return
  }
  const slots: AvailabilitySlot[] = createDays.value
    .filter((day) => day.enabled)
    .map((day) => ({
      weekday: day.weekday,
      startTime: toHm(day.startTime),
      endTime: toHm(day.endTime),
    }))
  if (createForm.helpType === 'transporte' && !createForm.vehicleType) {
    error.value = 'Indica el tipo de vehículo.'
    return
  }
  if (slots.length === 0) {
    error.value = 'Marca al menos un día y un horario.'
    return
  }
  for (const slot of slots) {
    if (slot.startTime >= slot.endTime) {
      error.value = 'En cada día marcado, la hora de salida debe ser posterior a la de entrada.'
      return
    }
  }
  saving.value = true
  try {
    await api.post('/time-volunteers', {
      helpType: createForm.helpType,
      fullName: createForm.fullName.trim(),
      phone: createForm.phone.trim(),
      email: createForm.email.trim() || undefined,
      vehicleType: createForm.helpType === 'transporte' ? createForm.vehicleType : undefined,
      vehicleInfo: createForm.vehicleInfo.trim() || undefined,
      notes: createForm.notes.trim() || undefined,
      slots,
    })
    flash.value = 'Persona agregada al registro.'
    cancelCreate()
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
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
        <h1>Registro de voluntarios</h1>
        <p class="lead">
          Personas que se inscribieron para ayudar en la sede o con transporte. Contacto y horario
          para coordinar. Solo administración y recepción.
        </p>
      </div>
      <div class="page-actions">
        <button
          v-if="!showCreate"
          class="btn btn-primary"
          type="button"
          @click="showCreate = true; selected = null"
        >
          Agregar al registro
        </button>
      </div>
    </div>

    <p v-if="error" class="flash flash-error">{{ error }}</p>
    <p v-if="flash" class="flash flash-ok">{{ flash }}</p>

    <form v-if="showCreate" class="card form" @submit.prevent="createPerson">
      <h2>Agregar persona</h2>
      <label class="field">
        <span>Cómo ayuda</span>
        <select v-model="createForm.helpType">
          <option value="sede">Voluntario en la sede</option>
          <option value="transporte">Transporte</option>
        </select>
      </label>
      <label class="field">
        <span>Nombre</span>
        <input v-model="createForm.fullName" required minlength="2" />
      </label>
      <label class="field">
        <span>Celular / WhatsApp</span>
        <input v-model="createForm.phone" required minlength="7" type="tel" />
      </label>
      <label class="field">
        <span>Correo (opcional)</span>
        <input v-model="createForm.email" type="email" />
      </label>
      <label v-if="createForm.helpType === 'transporte'" class="field">
        <span>Tipo de vehículo</span>
        <select v-model="createForm.vehicleType" required>
          <option value="" disabled>Selecciona</option>
          <option value="moto">Moto</option>
          <option value="carro">Carro</option>
          <option value="camioneta">Camioneta</option>
          <option value="otro">Otro</option>
        </select>
      </label>
      <label v-if="createForm.helpType === 'transporte'" class="field">
        <span>Detalle del vehículo (opcional)</span>
        <input v-model="createForm.vehicleInfo" placeholder="Ej. moto 125…" />
      </label>
      <label class="field">
        <span>Nota (opcional)</span>
        <textarea v-model="createForm.notes" placeholder="Zona, disponibilidad…" />
      </label>
      <p class="muted">Horario (opcional): marca los días si ya los sabes.</p>
      <div class="week">
        <article v-for="day in createDays" :key="day.weekday" class="day" :class="{ on: day.enabled }">
          <label class="check">
            <input v-model="day.enabled" type="checkbox" />
            <span>{{ day.label }}</span>
          </label>
          <label class="field">
            <span>Desde</span>
            <input v-model="day.startTime" type="time" :disabled="!day.enabled" />
          </label>
          <label class="field">
            <span>Hasta</span>
            <input v-model="day.endTime" type="time" :disabled="!day.enabled" />
          </label>
        </article>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" type="button" @click="cancelCreate">Cancelar</button>
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar en el registro' }}
        </button>
      </div>
    </form>

    <div class="tabs">
      <button type="button" class="tab" :class="{ active: tab === 'nuevos' }" @click="tab = 'nuevos'">
        Nuevos
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'sede' }" @click="tab = 'sede'">
        En la sede
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'transporte' }" @click="tab = 'transporte'">
        Transporte
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
            <th>Cómo ayuda</th>
            <th>Contacto</th>
            <th>Vehículo</th>
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
            <td data-label="Cómo ayuda">{{ helpTypeLabel[person.helpType ?? 'transporte'] }}</td>
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
            <td data-label="Vehículo">{{ vehicleLabel(person) }}</td>
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
            <td colspan="7" class="muted">No hay registros en esta vista.</td>
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
        <div><dt>Cómo ayuda</dt><dd>{{ helpTypeLabel[selected.helpType ?? 'transporte'] }}</dd></div>
        <div v-if="selected.email"><dt>Correo</dt><dd>{{ selected.email }}</dd></div>
        <div><dt>Vehículo</dt><dd>{{ vehicleLabel(selected) }}</dd></div>
        <div class="wide"><dt>Horario</dt><dd>{{ formatAvailability(selected.availability) }}</dd></div>
        <div v-if="selected.notes" class="wide"><dt>Nota</dt><dd>{{ selected.notes }}</dd></div>
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
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}
.check input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--terracotta);
}
.week {
  display: grid;
  gap: 0.55rem;
}
.day {
  display: grid;
  gap: 0.5rem;
  padding: 0.6rem;
  border: 1px solid var(--line);
  border-radius: 12px;
}
.day.on {
  border-color: rgba(46, 107, 99, 0.45);
}
@media (min-width: 720px) {
  .day {
    grid-template-columns: minmax(8rem, 1.1fr) minmax(0, 1fr) minmax(0, 1fr);
    align-items: end;
  }
}
</style>
