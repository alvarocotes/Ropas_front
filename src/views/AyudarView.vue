<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { AvailabilitySlot, TimeVolunteerHelpType, VehicleKind } from '@/types'
import { WEEKDAYS } from '@/types'

type DayDraft = {
  weekday: number
  label: string
  enabled: boolean
  startTime: string
  endTime: string
}

const emptyForm = () => ({
  helpType: '' as TimeVolunteerHelpType | '',
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

const isTransport = computed(() => form.helpType === 'transporte')

async function submit() {
  sending.value = true
  error.value = ''
  ok.value = false
  if (!form.helpType) {
    error.value = 'Elige si quieres ayudar en la sede o con transporte.'
    sending.value = false
    return
  }
  if (form.helpType === 'transporte' && !form.vehicleType) {
    error.value = 'Indica si tienes moto, carro, camioneta u otro vehículo.'
    sending.value = false
    return
  }
  if (form.helpType === 'transporte' && form.vehicleType === 'otro' && !form.vehicleInfo.trim()) {
    error.value = 'Describe el tipo de vehículo.'
    sending.value = false
    return
  }
  const slots: AvailabilitySlot[] = days.value
    .filter((day) => day.enabled)
    .map((day) => ({
      weekday: day.weekday,
      startTime: toHm(day.startTime),
      endTime: toHm(day.endTime),
    }))
  if (slots.length === 0) {
    error.value = isTransport.value
      ? 'Marca de qué hora a qué hora puedes hacer los transportes.'
      : 'Marca de qué hora a qué hora puedes ir a la sede.'
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
      helpType: form.helpType,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      vehicleType: form.helpType === 'transporte' ? form.vehicleType : undefined,
      vehicleInfo:
        form.helpType === 'transporte' && form.vehicleInfo.trim()
          ? form.vehicleInfo.trim()
          : undefined,
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
      Puedes ayudar en Pereira en la sede (alistar paquetes, recibir donaciones) o con transporte
      (llevar y recoger ropa). Elige cómo quieres participar y déjanos tus datos.
    </p>

    <form class="card form" @submit.prevent="submit">
      <fieldset>
        <legend>¿Cómo quieres ayudar?</legend>
        <div class="choice">
          <label class="option" :class="{ on: form.helpType === 'sede' }">
            <input v-model="form.helpType" type="radio" value="sede" required />
            <strong>Voluntario en la sede</strong>
            <span>Ayudar en el punto: alistar, recibir y organizar ropa.</span>
          </label>
          <label class="option" :class="{ on: form.helpType === 'transporte' }">
            <input v-model="form.helpType" type="radio" value="transporte" required />
            <strong>Transporte</strong>
            <span>Ayudarnos a transportar la ropa: recoger donaciones o llevar entregas.</span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Tus datos de contacto</legend>
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
          <span>Nota (opcional)</span>
          <textarea
            v-model="form.notes"
            :placeholder="
              isTransport
                ? 'Zona donde te puedes mover, barrios, etc.'
                : 'Algo que debamos saber para coordinar en la sede'
            "
          />
        </label>
      </fieldset>

      <fieldset v-if="isTransport">
        <legend>Tu vehículo</legend>
        <label class="field">
          <span>¿Qué tipo de vehículo tienes?</span>
          <select v-model="form.vehicleType" required>
            <option value="" disabled>Selecciona una opción</option>
            <option value="moto">Moto</option>
            <option value="carro">Carro</option>
            <option value="camioneta">Camioneta</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label v-if="form.vehicleType === 'otro'" class="field">
          <span>¿Cuál?</span>
          <input v-model="form.vehicleInfo" required placeholder="Ej. bicicleta, van…" />
        </label>
        <label v-else-if="form.vehicleType" class="field">
          <span>Detalle (opcional)</span>
          <input v-model="form.vehicleInfo" placeholder="Ej. carro pequeño, moto 125…" />
        </label>
      </fieldset>

      <fieldset v-if="form.helpType">
        <legend>{{ isTransport ? 'Horario para transportes' : 'Horario en la sede' }}</legend>
        <p class="hint">
          {{
            isTransport
              ? 'Marca los días y de qué hora a qué hora puedes hacer los transportes. Ejemplo: jueves de 8:00 a 12:00.'
              : 'Marca los días y de qué hora a qué hora puedes ir a ayudar en la sede.'
          }}
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
        Recibimos tu registro. Administración o recepción te contactarán para coordinar.
      </p>
      <button class="btn btn-primary" type="submit" :disabled="sending || !form.helpType">
        {{ sending ? 'Enviando...' : 'Enviar registro' }}
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

.choice {
  display: grid;
  gap: 0.7rem;
}

.option {
  display: grid;
  gap: 0.25rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  background: #fffdf7;
}

.option.on {
  border-color: rgba(46, 107, 99, 0.5);
}

.option input {
  margin-bottom: 0.2rem;
  accent-color: var(--terracotta);
}

.option span {
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
  .choice {
    grid-template-columns: 1fr 1fr;
  }

  .day {
    grid-template-columns: minmax(8rem, 1.1fr) minmax(0, 1fr) minmax(0, 1fr);
    align-items: end;
  }
}
</style>
