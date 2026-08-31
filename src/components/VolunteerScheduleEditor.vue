<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { AvailabilitySlot } from '@/types'
import { WEEKDAYS } from '@/types'

const emit = defineEmits<{
  error: [message: string]
  saved: [message: string]
}>()

const auth = useAuthStore()
const saving = ref(false)

type DayDraft = {
  weekday: number
  label: string
  enabled: boolean
  startTime: string
  endTime: string
}

const days = ref<DayDraft[]>(emptyWeek())

function emptyWeek(): DayDraft[] {
  return WEEKDAYS.map((day) => ({
    weekday: day.value,
    label: day.label,
    enabled: false,
    startTime: '08:00',
    endTime: '17:00',
  }))
}

function toHm(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  const hours = match?.[1]
  const minutes = match?.[2]
  if (!hours || !minutes) return '08:00'
  return `${hours.padStart(2, '0')}:${minutes}`
}

function fill(slots: AvailabilitySlot[] = []) {
  const byDay = new Map(slots.map((slot) => [slot.weekday, slot]))
  days.value = WEEKDAYS.map((day) => {
    const slot = byDay.get(day.value)
    return {
      weekday: day.value,
      label: day.label,
      enabled: Boolean(slot),
      startTime: slot?.startTime ?? '08:00',
      endTime: slot?.endTime ?? '17:00',
    }
  })
}

onMounted(async () => {
  try {
    await auth.fetchMe()
  } catch {
    /* se usa lo que ya hay en sesión */
  }
  fill(auth.user?.availability ?? [])
})

async function save() {
  const slots: AvailabilitySlot[] = days.value
    .filter((day) => day.enabled)
    .map((day) => ({
      weekday: day.weekday,
      startTime: toHm(day.startTime),
      endTime: toHm(day.endTime),
    }))
  for (const slot of slots) {
    if (slot.startTime >= slot.endTime) {
      emit('error', 'En cada día marcado, la hora de salida debe ser posterior a la de entrada.')
      return
    }
  }
  saving.value = true
  try {
    const data = await auth.saveAvailability(slots)
    fill(data)
    emit(
      'saved',
      slots.length
        ? 'Tu horario semanal se guardó.'
        : 'Quedaste sin días marcados. Puedes volver a indicarlos cuando quieras.',
    )
  } catch (err) {
    emit('error', apiErrorMessage(err, 'No se pudo guardar el horario'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="card form" @submit.prevent="save">
    <h2>Horario semanal</h2>
    <p class="hint">
      Marca los días en que irás y de qué hora a qué hora. Los días sin marcar quedan libres.
    </p>
    <div class="week">
      <article v-for="day in days" :key="day.weekday" class="day" :class="{ on: day.enabled }">
        <label class="check">
          <input v-model="day.enabled" type="checkbox" />
          <span>{{ day.label }}</span>
        </label>
        <label class="field">
          <span>Desde</span>
          <input v-model="day.startTime" type="time" :disabled="!day.enabled" :required="day.enabled" />
        </label>
        <label class="field">
          <span>Hasta</span>
          <input v-model="day.endTime" type="time" :disabled="!day.enabled" :required="day.enabled" />
        </label>
      </article>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit" :disabled="saving">
        {{ saving ? 'Guardando...' : 'Guardar horario' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.form { margin-top: 1rem; padding: 1.1rem; display: grid; gap: 0.8rem; }
.hint { color: var(--ink-soft); font-size: 0.92rem; margin: -0.2rem 0 0.2rem; }

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
  flex: 0 0 auto;
  accent-color: var(--terracotta);
}

.week { display: grid; gap: 0.7rem; }

.day {
  display: grid;
  gap: 0.6rem;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fffdf7;
}

.day.on { border-color: rgba(46, 107, 99, 0.45); }

@media (min-width: 720px) {
  .day {
    grid-template-columns: minmax(8rem, 1.1fr) minmax(0, 1fr) minmax(0, 1fr);
    align-items: end;
  }
}
</style>
