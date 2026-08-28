<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import StatusBadge from '@/components/StatusBadge.vue'
import type { User, UserRole } from '@/types'
import { roleLabel } from '@/types'

const users = ref<User[]>([])
const error = ref('')
const form = reactive({
  email: '',
  password: '',
  fullName: '',
  phone: '',
  role: 'volunteer' as UserRole,
})

async function load() {
  try {
    const { data } = await api.get<User[]>('/users')
    users.value = data
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

async function createUser() {
  error.value = ''
  try {
    await api.post('/users', form)
    form.email = ''
    form.password = ''
    form.fullName = ''
    form.phone = ''
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

async function toggleActive(user: User) {
  error.value = ''
  try {
    await api.patch(`/users/${user.id}`, { isActive: !user.isActive })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}
</script>

<template>
  <section>
    <h1>Usuarios</h1>
    <p class="lead">
      Solo el administrador crea cuentas. Hay cupo para dos voluntarios activos; las cuentas de
      recepción no tienen límite.
    </p>
    <p v-if="error" class="flash flash-error">{{ error }}</p>

    <form class="card form" @submit.prevent="createUser">
      <h2>Crear cuenta</h2>
      <label class="field"><span>Nombre</span><input v-model="form.fullName" required /></label>
      <label class="field"><span>Correo</span><input v-model="form.email" type="email" required /></label>
      <label class="field"><span>Contraseña</span><input v-model="form.password" type="password" minlength="8" required /></label>
      <label class="field"><span>Teléfono</span><input v-model="form.phone" /></label>
      <label class="field">
        <span>Rol</span>
        <select v-model="form.role">
          <option value="volunteer">Voluntario (alistamiento)</option>
          <option value="reception">Recepción (transporte y entrega)</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <button class="btn btn-primary" type="submit">Crear</button>
    </form>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td data-label="Nombre">{{ user.fullName }}</td>
            <td data-label="Correo">{{ user.email }}</td>
            <td data-label="Rol">{{ roleLabel[user.role] }}</td>
            <td data-label="Estado">
              <StatusBadge :tone="user.isActive ? 'listo' : 'cancelado'" :label="user.isActive ? 'Activo' : 'Inactivo'" />
            </td>
            <td>
              <button class="btn btn-ghost" type="button" @click="toggleActive(user)">
                {{ user.isActive ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead { color: var(--ink-soft); }
.form, .table-wrap { margin-top: 1rem; padding: 1.1rem; display: grid; gap: 0.8rem; }
</style>
