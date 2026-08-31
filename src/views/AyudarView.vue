<script setup lang="ts">
import { reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { AvailabilitySlot } from '@/types'
import { WEEKDAYS } from '@/types'

type DayDraft = {
  weekday: number
  label: string
  enabled: boolean
  startTime: string
  endTime: string
}

const emptyForm = () => ({
  fullName: '',
  phone: '',
  email: '',
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

function toHm(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  const hours = match?.[1]
  const minutes = match?.[2]
  if (!hours || !minutes) return '08:00'
  return `${hours.padStart(2, '0')}:${minutes}`
}

const form = reactive(emptyForm())
const days = ref<DayDraft[]>(emptyWeek())
const sending = ref(false)
const ok = ref(false)
const error = ref('')

async function submit() {
  sending.value = true
  error.value = ''
  ok.value = false
  const slots: AvailabilitySlot[] = days.value
    .filter((day) => day.enabled)
    .map((day) => ({
      weekday: day.weekday,
      startTime: toHm(day.startTime),
      endTime: toHm(day.endTime),
    }))
  if (slots.length === 0) {
    error.value = 'Marca al menos un día y de qué hora a qué hora puedes ir.'
    sending.value = false
    return
  }
  for (const slot of slots) {
    if (slot.startTime >= slot.endTime) {
      error.value = 'En cada día marcado, la hora de salida debe ser posterior a la de entrada.'
      sending.value = false
      return
    }
  }
  try {
    await api.post('/time-volunteers', {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
      slots,
    })
    ok.value = true
    Object.assign(form, emptyForm())
    days.value = emptyWeek()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo enviar el registro')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="page">
    <h1>Hacer parte</h1>
    <p>
      Si quieres ayudar con tu tiempo, regístrate. Indica tu número y los días y horas en que
      puedes ir. El equipo de ABRIGAR (administración y recepción) te contactará para cuadrar.
    </p>

    <form class="card form" @submit.prevent="submit">
      <fieldset>
        <legend>Tus datos</legend>
        <label class="field">
          <span>Nombre completo</span>
          <input v-model="form.fullName" required minlength="2" autocomplete="name" />
        </label>
        <div class="grid-2">
          <label class="field">
            <span>Celular / WhatsApp</span>
            <input v-model="form.phone" required minlength="7" type="tel" autocomplete="tel" />
          </label>
          <label class="field">
            <span>Correo (opcional)</span>
            <input v-model="form.email" type="email" autocomplete="email" />
          </label>
        </div>
        <label class="field">
          <span>¿En qué te gustaría ayudar? (opcional)</span>
          <textarea
            v-model="form.notes"
            placeholder="Por ejemplo: alistar paquetes, recibir donaciones, apoyar en una jornada…"
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Cuándo puedes ir</legend>
        <p class="hint">
          Marca los días y de qué hora a qué hora. Ejemplo: jueves de 8:00 a 12:00.
        </p>
        <div class="week">
          <article v-for="day in days" :key="day.weekday" class="day" :class="{ on: day.enabled }">
            <label class="check">
              <input v-model="day.enabled" type="checkbox" />
              <span>{{ day.label }}</span>
            </label>
            <label class="field">
              <span>Desde</span>
              <input
                v-model="day.startTime"
                type="time"
                :disabled="!day.enabled"
                :required="day.enabled"
              />
            </label>
            <label class="field">
              <span>Hasta</span>
              <input
                v-model="day.endTime"
                type="time"
                :disabled="!day.enabled"
                :required="day.enabled"
              />
            </label>
          </article>
        </div>
      </fieldset>

      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <p v-if="ok" class="flash flash-ok">
        Recibimos tu registro. Te contactaremos para coordinar el día y la hora.
      </p>
      <button class="btn btn-primary" type="submit" :disabled="sending">
        {{ sending ? 'Enviando...' : 'Quiero hacer parte' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

h1 {
  font-size: clamp(1.7rem, 8vw, 3rem);
  margin-bottom: 0.5rem;
}

.form {
  margin-top: 1.4rem;
  padding: 1.1rem;
  display: grid;
  gap: 1.2rem;
}

fieldset {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1rem 0.9rem 1.1rem;
  display: grid;
  gap: 0.9rem;
}

legend {
  font-family: var(--display);
  font-weight: 700;
  padding: 0 0.4rem;
}

.hint {
  color: var(--ink-soft);
  font-size: 0.92rem;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.check input {
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 auto;
  accent-color: var(--terracotta);
}

.week {
  display: grid;
  gap: 0.7rem;
}

.day {
  display: grid;
  gap: 0.6rem;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fffdf7;
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
