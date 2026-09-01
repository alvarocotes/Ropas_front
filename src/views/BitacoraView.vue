<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import OverlayCard from '@/components/OverlayCard.vue'
import { useLiveReload } from '@/composables/useLiveReload'
import { useAuthStore } from '@/stores/auth'
import type { ShiftLog } from '@/types'
import { formatWorkDate, localIsoDate } from '@/types'

const auth = useAuthStore()
const logs = ref<ShiftLog[]>([])
const error = ref('')
const filterDate = ref('')
const overlay = ref(false)
const editing = ref<ShiftLog | null>(null)
const saving = ref(false)
const form = reactive({
  workDate: localIsoDate(),
  startTime: '08:00',
  endTime: '09:00',
  summary: '',
  followUp: '',
})

const visible = computed(() => {
  if (!filterDate.value) return logs.value
  return logs.value.filter((row) => row.workDate === filterDate.value)
})

function canEdit(row: ShiftLog) {
  return auth.isAdmin || row.userId === auth.user?.id
}

async function load(opts?: { quiet?: boolean }) {
  try {
    const { data } = await api.get<ShiftLog[]>('/shift-logs')
    logs.value = data
  } catch (err) {
    if (!opts?.quiet) error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

useLiveReload(() => load({ quiet: true }), {
  paused: () => overlay.value,
})

function openCreate() {
  editing.value = null
  form.workDate = localIsoDate()
  form.startTime = '08:00'
  form.endTime = '09:00'
  form.summary = ''
  form.followUp = ''
  error.value = ''
  overlay.value = true
}

function openEdit(row: ShiftLog) {
  editing.value = row
  form.workDate = row.workDate
  form.startTime = row.startTime
  form.endTime = row.endTime
  form.summary = row.summary
  form.followUp = row.followUp
  error.value = ''
  overlay.value = true
}

function close() {
  if (saving.value) return
  overlay.value = false
  editing.value = null
}

async function save() {
  saving.value = true
  error.value = ''
  const payload = {
    workDate: form.workDate,
    startTime: form.startTime,
    endTime: form.endTime,
    summary: form.summary,
    followUp: form.followUp,
  }
  try {
    if (editing.value) {
      await api.patch(`/shift-logs/${editing.value.id}`, payload)
    } else {
      await api.post('/shift-logs', payload)
    }
    overlay.value = false
    editing.value = null
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function remove(row: ShiftLog) {
  if (!confirm('¿Borrar esta bitácora?')) return
  error.value = ''
  try {
    await api.delete(`/shift-logs/${row.id}`)
    if (editing.value?.id === row.id) close()
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
        <h1>Bitácora por turno</h1>
        <p class="lead">
          Anota de qué hora a qué hora fue el turno, qué se hizo y con qué debe seguir el siguiente.
        </p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" type="button" @click="openCreate">Registrar turno</button>
      </div>
    </div>

    <p v-if="error && !overlay" class="flash flash-error">{{ error }}</p>

    <label class="field filter">
      <span>Filtrar por fecha</span>
      <input v-model="filterDate" type="date" />
    </label>

    <p v-if="visible.length === 0" class="empty">Aún no hay bitácoras{{ filterDate ? ' en esa fecha' : '' }}.</p>

    <div class="list">
      <article v-for="row in visible" :key="row.id" class="card item">
        <header>
          <strong>{{ formatWorkDate(row.workDate) }} · {{ row.startTime }} – {{ row.endTime }}</strong>
          <small>{{ row.authorName }}</small>
        </header>
        <p><span class="lbl">Actividades</span>{{ row.summary }}</p>
        <p><span class="lbl">Seguir con</span>{{ row.followUp }}</p>
        <div class="item-actions">
          <button class="btn btn-ghost" type="button" @click="openEdit(row)">
            {{ canEdit(row) ? 'Editar' : 'Ver' }}
          </button>
          <button v-if="canEdit(row)" class="btn btn-ghost" type="button" @click="remove(row)">
            Borrar
          </button>
        </div>
      </article>
    </div>

    <OverlayCard v-if="overlay" @close="close">
      <form class="form" @submit.prevent="save">
        <h2>{{ editing ? (canEdit(editing) ? 'Editar turno' : 'Bitácora') : 'Registrar turno' }}</h2>
        <p v-if="error" class="flash flash-error">{{ error }}</p>
        <label class="field">
          <span>Fecha</span>
          <input v-model="form.workDate" type="date" required :disabled="Boolean(editing && !canEdit(editing))" />
        </label>
        <div class="times">
          <label class="field">
            <span>De</span>
            <input v-model="form.startTime" type="time" required :disabled="Boolean(editing && !canEdit(editing))" />
          </label>
          <label class="field">
            <span>A</span>
            <input v-model="form.endTime" type="time" required :disabled="Boolean(editing && !canEdit(editing))" />
          </label>
        </div>
        <label class="field">
          <span>Resumen de actividades</span>
          <textarea v-model="form.summary" rows="4" required :disabled="Boolean(editing && !canEdit(editing))" />
        </label>
        <label class="field">
          <span>Con qué se debe seguir</span>
          <textarea v-model="form.followUp" rows="3" required :disabled="Boolean(editing && !canEdit(editing))" />
        </label>
        <div class="form-actions">
          <button class="btn btn-ghost" type="button" @click="close">Cerrar</button>
          <button
            v-if="!editing || canEdit(editing)"
            class="btn btn-primary"
            type="submit"
            :disabled="saving"
          >
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </OverlayCard>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead { color: var(--ink-soft); }
.filter { max-width: 16rem; margin: 0.8rem 0 1rem; }
.empty { color: var(--ink-soft); }
.list { display: grid; gap: 0.85rem; }
.item { padding: 1rem 1.1rem; display: grid; gap: 0.55rem; }
.item header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: baseline;
}
.item small { color: var(--ink-soft); }
.lbl {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--teal);
  margin-bottom: 0.15rem;
}
.item-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.form { display: grid; gap: 0.8rem; }
.times { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
</style>
