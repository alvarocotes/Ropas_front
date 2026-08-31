<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AttendanceEditor from '@/components/AttendanceEditor.vue'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/api/client'

const auth = useAuthStore()
const error = ref('')
const flash = ref('')
const savingProfile = ref(false)

const profile = reactive({
  fullName: '',
  email: '',
  phone: '',
  currentPassword: '',
  password: '',
})

function fillFromUser() {
  const user = auth.user
  if (!user) return
  profile.fullName = user.fullName
  profile.email = user.email
  profile.phone = user.phone ?? ''
  profile.currentPassword = ''
  profile.password = ''
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

    <AttendanceEditor
      @error="(message) => { error = message; flash = '' }"
      @saved="(message) => { flash = message; error = '' }"
    />
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead { color: var(--ink-soft); }
.form { margin-top: 1rem; padding: 1.1rem; display: grid; gap: 0.8rem; }
</style>
