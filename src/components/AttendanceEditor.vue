<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { AttendanceRecord } from '@/types'
import { formatWorkDate, localIsoDate } from '@/types'

const emit = defineEmits<{
  error: [message: string]
  saved: [message: string]
}>()

const auth = useAuthStore()
const saving = ref(false)
const removingId = ref<number | null>(null)
const date = ref(localIsoDate())
const startTime = ref('08:00')
const endTime = ref('17:00')

const rows = computed(() => auth.user?.attendances ?? [])
const today = localIsoDate()
const upcoming = computed(() => rows.value.filter((row) => row.date >= today))
const past = computed(() =>
  [...rows.value.filter((row) => row.date < today)].sort((a, b) =>
    b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime),
  ),
)

function toHm(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  const hours = match?.[1]
  const minutes = match?.[2]
  if (!hours || !minutes) return '08:00'
  return `${hours.padStart(2, '0')}:${minutes}`
}

onMounted(async () => {
  try {
    await auth.fetchMe()
  } catch {
    /* se usa lo que ya hay en sesión */
  }
})

async function add() {
  const start = toHm(startTime.value)
  const end = toHm(endTime.value)
  if (!date.value) {
    emit('error', 'Elige una fecha.')
    return
  }
  if (start >= end) {
    emit('error', 'La hora de salida debe ser posterior a la de entrada.')
    return
  }
  saving.value = true
  try {
    await auth.addAttendance({ date: date.value, startTime: start, endTime: end })
    emit('saved', `Quedó registrado el ${formatWorkDate(date.value)} de ${start} a ${end}.`)
  } catch (err) {
    emit('error', apiErrorMessage(err, 'No se pudo guardar esa fecha'))
  } finally {
    saving.value = false
  }
}

async function remove(row: AttendanceRecord) {
  removingId.value = row.id
  try {
    await auth.removeAttendance(row.id)
    emit('saved', `Se quitó el ${formatWorkDate(row.date)} (${row.startTime}–${row.endTime}).`)
  } catch (err) {
    emit('error', apiErrorMessage(err, 'No se pudo quitar ese registro'))
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <div class="card form">
    <h2>Horario por fechas</h2>
    <p class="hint">
      Agrega cada día en el que irás, con hora de entrada y salida. Queda un registro por fecha;
      el equipo lo verá en el panel.
    </p>
    <form class="add" @submit.prevent="add">
      <label class="field">
        <span>Fecha</span>
        <input v-model="date" type="date" required />
      </label>
      <label class="field">
        <span>Desde</span>
        <input v-model="startTime" type="time" required />
      </label>
      <label class="field">
        <span>Hasta</span>
        <input v-model="endTime" type="time" required />
      </label>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Agregar fecha' }}
        </button>
      </div>
    </form>

    <p v-if="rows.length === 0" class="empty">Todavía no hay fechas registradas.</p>
    <template v-else>
      <h3>Próximas</h3>
      <p v-if="upcoming.length === 0" class="empty">No hay fechas de hoy en adelante.</p>
      <ul v-else class="list">
        <li v-for="row in upcoming" :key="row.id">
          <div>
            <strong>{{ formatWorkDate(row.date) }}</strong>
            <span>{{ row.startTime }} – {{ row.endTime }}</span>
          </div>
          <button
            class="btn btn-ghost"
            type="button"
            :disabled="removingId === row.id"
            @click="remove(row)"
          >
            Quitar
          </button>
        </li>
      </ul>
      <template v-if="past.length">
        <h3>Anteriores</h3>
        <ul class="list past">
          <li v-for="row in past" :key="row.id">
            <div>
              <strong>{{ formatWorkDate(row.date) }}</strong>
              <span>{{ row.startTime }} – {{ row.endTime }}</span>
            </div>
            <button
              class="btn btn-ghost"
              type="button"
              :disabled="removingId === row.id"
              @click="remove(row)"
            >
              Quitar
            </button>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

<style scoped>
.form { margin-top: 1rem; padding: 1.1rem; display: grid; gap: 0.8rem; }
.hint { color: var(--ink-soft); font-size: 0.92rem; margin: -0.2rem 0 0.2rem; }
.empty { color: var(--ink-soft); margin: 0; }
h3 { font-size: 0.95rem; margin: 0.4rem 0 0; }

.add {
  display: grid;
  gap: 0.7rem;
}

.list {
  list-style: none;
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fffdf7;
}

.list li div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.list.past li {
  opacity: 0.78;
}

@media (min-width: 720px) {
  .add {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: end;
  }
  .add .form-actions { margin: 0; }
}
</style>
