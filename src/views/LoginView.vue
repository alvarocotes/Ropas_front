<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '@/api/client'
import { brandLogo } from '@/brand'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const form = reactive({ email: '', password: '' })
const error = ref('')
const sending = ref(false)

onMounted(() => {
  if (auth.token) void router.replace('/panel')
})

async function submit() {
  sending.value = true
  error.value = ''
  try {
    await auth.login(form.email, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/panel'
    await router.push(redirect)
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo iniciar sesión')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="screen">
    <form class="card box" @submit.prevent="submit">
      <img :src="brandLogo" alt="Logo de Entretejidos" class="logo" />
      <p class="eyebrow">Acceso interno</p>
      <h1>Entrar a Entretejidos</h1>
      <p class="hint">Solo voluntarios y el administrador del sistema.</p>
      <label class="field">
        <span>Correo</span>
        <input v-model="form.email" type="email" required autocomplete="username" />
      </label>
      <label class="field">
        <span>Contraseña</span>
        <input v-model="form.password" type="password" required minlength="8" autocomplete="current-password" />
      </label>
      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <button class="btn btn-primary" type="submit" :disabled="sending">
        {{ sending ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 1rem;
  padding-top: max(1rem, env(safe-area-inset-top));
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  background-color: var(--paper);
  background-image:
    radial-gradient(circle at top left, rgba(196, 90, 60, 0.2), transparent 40%),
    radial-gradient(circle at bottom right, rgba(46, 107, 99, 0.18), transparent 42%),
    var(--fabric);
  background-size: auto, auto, 4px 4px, 4px 4px, 16px 16px;
}

.box {
  width: min(420px, 100%);
  padding: 1.3rem;
  display: grid;
  gap: 0.9rem;
}

.logo {
  width: 140px;
  aspect-ratio: 1;
  object-fit: contain;
  background: transparent;
  justify-self: center;
}

.box .btn {
  width: 100%;
}

.eyebrow {
  color: var(--terracotta);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
}

.hint {
  color: var(--ink-soft);
}
</style>
