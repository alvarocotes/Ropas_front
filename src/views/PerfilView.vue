<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { AvailabilitySlot } from '@/types'
import { WEEKDAYS } from '@/types'

const auth = useAuthStore()
const error = ref('')
const flash = ref('')
const savingProfile = ref(false)
const savingHours = ref(false)

const profile = reactive({
  fullName: '',
  email: '',
  phone: '',
  currentPassword: '',
  password: '',
})

type DayDraft = {
  weekday: number
  enabled: boolean
  startTime: string
  endTime: string
}

const days = ref<DayDraft[]>(
  WEEKDAYS.map((day) => ({
    weekday: day.value,
    enabled: false,
    startTime: '08:00',
    endTime: '17:00',
  })),
)

const isVolunteer = computed(() => auth.user?.role === 'volunteer')

function toHm(value: string) {
  const [hours = '00', minutes = '00'] = value.split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0').slice(0, 2)}`
}

function fillFromUser() {
  const user = auth.user
  if (!user) return
  profile.fullName = user.fullName
  profile.email = user.email
  profile.phone = user.phone ?? ''
  profile.currentPassword = ''
  profile.password = ''
  const byDay = new Map((user.availability ?? []).map((slot) => [slot.weekday, slot]))
  days.value = WEEKDAYS.map((day) => {
    const slot = byDay.get(day.value)
    return {
      weekday: day.value,
      enabled: Boolean(slot),
      startTime: slot?.startTime ?? '08:00',
      endTime: slot?.endTime ?? '17:00',
    }
  })
}

onMounted(async () => {
  try {
    await auth.fetchMe()
    fillFromUser()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
})

async function saveProfile() {
  error.value = ''
  flash.value = ''
  if (profile.password && !profile.currentPassword) {
    error.value = 'Escribe la contraseña actual para cambiarla.'
    return
  }
  savingProfile.value = true
  try {
    await auth.updateProfile({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      ...(profile.password
        ? { password: profile.password, currentPassword: profile.currentPassword }
        : {}),
    })
    profile.password = ''
    profile.currentPassword = ''
    fillFromUser()
    flash.value = 'Tus datos se guardaron.'
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    savingProfile.value = false
  }
}

async function saveHours() {
  error.value = ''
  flash.value = ''
  const slots: AvailabilitySlot[] = days.value
    .filter((day) => day.enabled)
    .map((day) => ({
      weekday: day.weekday,
      startTime: toHm(day.startTime),
      endTime: toHm(day.endTime),
    }))
  for (const slot of slots) {
    if (slot.startTime >= slot.endTime) {
      error.value = 'En cada día que vayas, la hora de salida debe ser posterior a la de entrada.'
      return
    }
  }
  savingHours.value = true
  try {
    await api.put('/auth/me/availability', { slots })
    await auth.fetchMe()
    fillFromUser()
    flash.value = 'Tu horario semanal se guardó.'
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    savingHours.value = false
  }
}
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h1>Mi perfil</h1>
        <p class="lead">Actualiza tu información. La contraseña solo cambia si escribes una nueva.</p>
      </div>
    </div>
    <p v-if="error" class="flash flash-error">{{ error }}</p>
    <p v-if="flash" class="flash flash-ok">{{ flash }}</p>

    <form class="card form" @submit.prevent="saveProfile">
      <h2>Tus datos</h2>
      <label class="field">
        <span>Nombre</span>
        <input v-model="profile.fullName" required autocomplete="name" />
      </label>
      <label class="field">
        <span>Correo</span>
        <input v-model="profile.email" type="email" required autocomplete="email" />
      </label>
      <label class="field">
        <span>Teléfono</span>
        <input v-model="profile.phone" type="tel" autocomplete="tel" />
      </label>
      <label class="field">
        <span>Contraseña actual</span>
        <input
          v-model="profile.currentPassword"
          type="password"
          minlength="8"
          autocomplete="current-password"
          :required="Boolean(profile.password)"
        />
      </label>
      <label class="field">
        <span>Nueva contraseña (opcional)</span>
        <input
          v-model="profile.password"
          type="password"
          minlength="8"
          autocomplete="new-password"
        />
      </label>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" :disabled="savingProfile">
          {{ savingProfile ? 'Guardando...' : 'Guardar datos' }}
        </button>
      </div>
    </form>

    <form v-if="isVolunteer" class="card form" @submit.prevent="saveHours">
      <h2>Horario semanal</h2>
      <p class="hint">
        Marca los días en que irás al aplicativo y la franja en la que estarás. Los días sin marcar
        quedan libres.
      </p>
      <div class="week">
        <article v-for="day in days" :key="day.weekday" class="day" :class="{ on: day.enabled }">
          <label class="check">
            <input v-model="day.enabled" type="checkbox" />
            <span>{{ WEEKDAYS.find((item) => item.value === day.weekday)?.label }}</span>
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
        <button class="btn btn-primary" type="submit" :disabled="savingHours">
          {{ savingHours ? 'Guardando...' : 'Guardar horario' }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead, .hint { color: var(--ink-soft); }
.form { margin-top: 1rem; padding: 1.1rem; display: grid; gap: 0.8rem; }
.hint { font-size: 0.92rem; margin: -0.2rem 0 0.2rem; }

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
