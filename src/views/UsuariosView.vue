<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import OverlayCard from '@/components/OverlayCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useLiveReload } from '@/composables/useLiveReload'
import { useAuthStore } from '@/stores/auth'
import type { User, UserRole } from '@/types'
import { formatAttendances, roleLabel } from '@/types'

const auth = useAuthStore()
const users = ref<User[]>([])
const error = ref('')
const flash = ref('')
const showCreate = ref(false)
const saving = ref(false)
const editing = ref<User | null>(null)

const emptyForm = () => ({
  email: '',
  password: '',
  fullName: '',
  phone: '',
  role: 'volunteer' as UserRole,
  isActive: true,
})

const form = reactive(emptyForm())

async function load(opts?: { quiet?: boolean }) {
  try {
    const { data } = await api.get<User[]>('/users')
    users.value = data
    if (!opts?.quiet) error.value = ''
  } catch (err) {
    if (!opts?.quiet) error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

useLiveReload(() => load({ quiet: true }), {
  paused: () => showCreate.value || Boolean(editing.value) || saving.value,
})

function resetForm() {
  Object.assign(form, emptyForm())
}

function cancelForm() {
  showCreate.value = false
  editing.value = null
  resetForm()
  error.value = ''
}

function openCreate() {
  editing.value = null
  resetForm()
  showCreate.value = true
  error.value = ''
  flash.value = ''
}

function openEdit(user: User) {
  showCreate.value = false
  editing.value = user
  form.fullName = user.fullName
  form.email = user.email
  form.phone = user.phone ?? ''
  form.role = user.role
  form.password = ''
  form.isActive = user.isActive
  error.value = ''
  flash.value = ''
}

const isEditingSelf = () => editing.value?.id === auth.user?.id

async function saveUser() {
  error.value = ''
  const fullName = form.fullName.trim()
  const email = form.email.trim().toLowerCase()
  const phone = form.phone.trim()
  if (fullName.length < 2) {
    error.value = 'El nombre debe tener al menos 2 caracteres.'
    return
  }
  if (!email.includes('@')) {
    error.value = 'Escribe un correo válido.'
    return
  }
  if (!editing.value && form.password.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (editing.value && form.password && form.password.length < 8) {
    error.value = 'La nueva contraseña debe tener al menos 8 caracteres.'
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await api.patch(`/users/${editing.value.id}`, {
        fullName,
        email,
        phone,
        ...(isEditingSelf() ? {} : { role: form.role, isActive: form.isActive }),
        ...(form.password ? { password: form.password } : {}),
      })
      flash.value = 'Usuario actualizado.'
    } else {
      await api.post('/users', {
        fullName,
        email,
        password: form.password,
        role: form.role,
        ...(phone ? { phone } : {}),
      })
      flash.value = 'Cuenta creada.'
    }
    cancelForm()
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function toggleActive(user: User) {
  error.value = ''
  flash.value = ''
  if (auth.user?.id === user.id) {
    error.value = 'No puedes desactivar tu propia cuenta.'
    return
  }
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
    <div class="page-head">
      <div>
        <h1>Usuarios</h1>
        <p class="lead">
          Crea cuentas, cambia el rol (voluntario, recepción o administrador) y edita nombre,
          correo o contraseña.
        </p>
      </div>
      <div class="page-actions">
        <button
          v-if="!showCreate && !editing"
          class="btn btn-primary"
          type="button"
          @click="openCreate"
        >
          Crear cuenta
        </button>
      </div>
    </div>
    <p v-if="error && !showCreate && !editing" class="flash flash-error">{{ error }}</p>
    <p v-if="flash && !showCreate && !editing" class="flash flash-ok">{{ flash }}</p>

    <OverlayCard v-if="showCreate || editing" @close="cancelForm">
    <form class="form" @submit.prevent="saveUser">
      <h2>{{ editing ? `Editar a ${editing.fullName}` : 'Crear cuenta' }}</h2>
      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <label class="field">
        <span>Nombre</span>
        <input v-model="form.fullName" required minlength="2" autocomplete="name" />
      </label>
      <label class="field">
        <span>Correo</span>
        <input v-model="form.email" type="email" required autocomplete="off" />
      </label>
      <label class="field">
        <span>{{ editing ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</span>
        <input
          v-model="form.password"
          type="password"
          minlength="8"
          :required="!editing"
          autocomplete="new-password"
        />
      </label>
      <label class="field">
        <span>Teléfono (opcional)</span>
        <input v-model="form.phone" type="tel" />
      </label>
      <label class="field">
        <span>Rol</span>
        <select v-model="form.role" :disabled="isEditingSelf()">
          <option value="volunteer">Voluntario (alistamiento)</option>
          <option value="reception">Recepción (transporte y entrega)</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <p v-if="isEditingSelf()" class="muted">No puedes cambiar tu propio rol desde aquí.</p>
      <label v-if="editing && !isEditingSelf()" class="check">
        <input v-model="form.isActive" type="checkbox" />
        <span>Cuenta activa</span>
      </label>
      <div class="form-actions">
        <button class="btn btn-ghost" type="button" @click="cancelForm">Cancelar</button>
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear' }}
        </button>
      </div>
    </form>
    </OverlayCard>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Horario</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="users.length === 0">
            <td colspan="6" class="muted">No hay usuarios para mostrar.</td>
          </tr>
          <tr v-for="user in users" :key="user.id">
            <td data-label="Nombre">{{ user.fullName }}</td>
            <td data-label="Correo">{{ user.email }}</td>
            <td data-label="Rol">{{ roleLabel[user.role] }}</td>
            <td data-label="Horario">
              {{ formatAttendances(user.attendances) }}
            </td>
            <td data-label="Estado">
              <StatusBadge :tone="user.isActive ? 'listo' : 'cancelado'" :label="user.isActive ? 'Activo' : 'Inactivo'" />
            </td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost" type="button" @click="openEdit(user)">Editar</button>
                <button
                  class="btn btn-ghost"
                  type="button"
                  :disabled="auth.user?.id === user.id"
                  @click="toggleActive(user)"
                >
                  {{ user.isActive ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead, .muted { color: var(--ink-soft); }
.form { display: grid; gap: 0.8rem; }
.table-wrap { margin-top: 1rem; padding: 1.1rem; display: grid; gap: 0.8rem; }
.row-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.check input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--terracotta);
}
</style>
