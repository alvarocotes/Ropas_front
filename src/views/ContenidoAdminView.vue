<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import MapPicker from '@/components/MapPicker.vue'
import type { AboutSection } from '@/types'

const sections = ref<AboutSection[]>([])
const error = ref('')
const flash = ref('')
const savingId = ref<number | null>(null)

interface DeliveryLocation {
  id: number
  address: string
  peopleCount: number
  latitude: number | null
  longitude: number | null
  geoLabel: string | null
  manualItemsDelivered: number
}

const locations = ref<DeliveryLocation[]>([])
const drafts = reactive<
  Record<
    number,
    {
      latitude: number | null
      longitude: number | null
      geoLabel: string
      manualItemsDelivered: number
      peopleCount: number
    }
  >
>({})
const selectedId = ref<number | null>(null)

const unlocated = computed(() => locations.value.filter((item) => item.latitude === null))
const located = computed(() => locations.value.filter((item) => item.latitude !== null))

const selected = computed(
  () => locations.value.find((item) => item.id === selectedId.value) ?? null,
)

const selectedDraft = computed(() =>
  selectedId.value === null ? null : draftFor(selectedId.value),
)

/** Los demás puntos se dibujan en gris para servir de referencia al ubicar uno nuevo. */
const otherPoints = computed(() =>
  locations.value
    .filter(
      (item) => item.id !== selectedId.value && item.latitude !== null && item.longitude !== null,
    )
    .map((item) => ({
      latitude: item.latitude as number,
      longitude: item.longitude as number,
      label: item.geoLabel ?? `Entrega #${item.id}`,
    })),
)

function select(item: DeliveryLocation) {
  selectedId.value = item.id
  flash.value = ''
  error.value = ''
}

function applySixPerPerson() {
  if (selectedId.value === null) return
  const draft = draftFor(selectedId.value)
  draft.manualItemsDelivered = Math.max(0, draft.peopleCount) * 6
}

function onPick(latitude: number, longitude: number) {
  if (selectedId.value === null) return
  const draft = draftFor(selectedId.value)
  draft.latitude = latitude
  draft.longitude = longitude
}

async function load() {
  try {
    const [sectionRes, locationRes] = await Promise.all([
      api.get<AboutSection[]>('/about/sections/admin'),
      api.get<DeliveryLocation[]>('/about/locations'),
    ])
    sections.value = sectionRes.data
    locations.value = locationRes.data
    for (const item of locationRes.data) {
      drafts[item.id] = {
        latitude: item.latitude,
        longitude: item.longitude,
        geoLabel: item.geoLabel ?? '',
        manualItemsDelivered: item.manualItemsDelivered ?? 0,
        peopleCount: item.peopleCount,
      }
    }
    if (selectedId.value === null) {
      selectedId.value = locationRes.data.find((item) => item.latitude === null)?.id ?? null
    }
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

function draftFor(id: number) {
  if (!drafts[id]) {
    drafts[id] = {
      latitude: null,
      longitude: null,
      geoLabel: '',
      manualItemsDelivered: 0,
      peopleCount: 1,
    }
  }
  return drafts[id]
}

async function saveLocation(item: DeliveryLocation) {
  error.value = ''
  flash.value = ''
  const draft = draftFor(item.id)
  try {
    await api.patch(`/about/locations/${item.id}`, {
      latitude: draft.latitude ?? undefined,
      longitude: draft.longitude ?? undefined,
      geoLabel: draft.geoLabel || undefined,
      manualItemsDelivered: draft.manualItemsDelivered ?? 0,
      peopleCount: draft.peopleCount || undefined,
    })
    flash.value = `La entrega #${item.id} se guardó.`
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

async function saveSection(section: AboutSection) {
  error.value = ''
  flash.value = ''
  savingId.value = section.id
  try {
    await api.patch(`/about/sections/${section.id}`, {
      title: section.title,
      body: section.body,
      isVisible: section.isVisible,
      position: section.position,
    })
    flash.value = `"${section.title}" se guardó correctamente.`
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    savingId.value = null
  }
}

</script>

<template>
  <section>
    <h1>Contenido público</h1>
    <p class="lead">
      Edita los textos de la página <strong>Quiénes somos</strong> y ubica en el mapa cada entrega
      realizada.
    </p>
    <p v-if="error" class="flash flash-error">{{ error }}</p>
    <p v-if="flash" class="flash flash-ok">{{ flash }}</p>

    <article v-for="section in sections" :key="section.id" class="card block">
      <label class="field">
        <span>Título</span>
        <input v-model="section.title" maxlength="150" />
      </label>
      <label class="field">
        <span>Texto (deja una línea en blanco para separar párrafos)</span>
        <textarea v-model="section.body" rows="6" />
      </label>
      <div class="row">
        <label class="check">
          <input v-model="section.isVisible" type="checkbox" />
          <span>Visible en la página pública</span>
        </label>
        <label class="order">
          <span>Orden</span>
          <input v-model.number="section.position" class="mini" type="number" min="0" />
        </label>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="savingId === section.id"
          @click="saveSection(section)"
        >
          Guardar
        </button>
      </div>
    </article>

    <div class="card block">
      <h2>Puntos del mapa</h2>
      <p class="hint">
        Elige una entrega de la lista y marca su punto haciendo clic en el mapa (o arrastrando el
        marcador). Si prefieres, escribe las coordenadas a mano. En público solo se muestra el
        sector, nunca la dirección.
      </p>
      <p class="muted">
        {{ located.length }} de {{ locations.length }} entregas ya tienen punto en el mapa.
      </p>

      <div class="loc-layout">
        <ul class="loc-list">
          <li
            v-for="item in locations"
            :key="item.id"
            :class="{ active: item.id === selectedId, pending: item.latitude === null }"
          >
            <button type="button" class="loc-pick" @click="select(item)">
              <strong>#{{ item.id }} · {{ item.address }}</strong>
              <small>
                {{ item.peopleCount }} persona(s) · {{ item.manualItemsDelivered }} prenda(s) ·
                {{ item.latitude === null ? 'sin ubicar' : (item.geoLabel ?? 'ubicada') }}
              </small>
            </button>
          </li>
        </ul>

        <div v-if="selected && selectedDraft" class="loc-editor">
          <p class="loc-title">
            <strong>#{{ selected.id }}</strong> · {{ selected.address }}
          </p>
          <MapPicker
            :latitude="selectedDraft.latitude"
            :longitude="selectedDraft.longitude"
            :references="otherPoints"
            @pick="onPick"
          />
          <div class="loc-form">
            <label class="field">
              <span>Latitud</span>
              <input v-model.number="selectedDraft.latitude" type="number" step="any" />
            </label>
            <label class="field">
              <span>Longitud</span>
              <input v-model.number="selectedDraft.longitude" type="number" step="any" />
            </label>
            <label class="field">
              <span>Sector visible al público</span>
              <input v-model="selectedDraft.geoLabel" placeholder="Ej. La Sultana, Pereira" />
            </label>
            <label class="field">
              <span>Personas ayudadas</span>
              <input v-model.number="selectedDraft.peopleCount" type="number" min="1" step="1" />
            </label>
            <label class="field">
              <span>Prendas entregadas</span>
              <input
                v-model.number="selectedDraft.manualItemsDelivered"
                type="number"
                min="0"
                step="1"
              />
            </label>
          </div>
          <div class="row">
            <button class="btn btn-ghost" type="button" @click="applySixPerPerson">
              Calcular prendas (6 por persona)
            </button>
          </div>
          <p class="hint">
            Las prendas se cuentan aquí solo cuando no salieron del inventario de la plataforma,
            como en las jornadas y las entregas anteriores. Lo que entregues desde ahora por la
            plataforma se suma solo, con el paquete del inventario.
          </p>
          <button class="btn btn-primary" type="button" @click="saveLocation(selected)">
            Guardar
          </button>
        </div>
        <p v-else class="muted">Selecciona una entrega para ubicarla.</p>
      </div>
    </div>

  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead, .muted, .hint { color: var(--ink-soft); }
.hint { font-size: 0.9rem; }
.block { padding: 1.1rem; margin-top: 1rem; display: grid; gap: 0.8rem; }
.block h2 { font-family: var(--display); }

.row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.check input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--terracotta);
}

.order {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--ink-soft);
}

.mini {
  width: 80px;
  min-height: 40px;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: white;
  padding: 0.3rem 0.4rem;
}

.loc-layout {
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  gap: 0.9rem;
  align-items: start;
}

.loc-list {
  list-style: none;
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  max-height: 420px;
  overflow-y: auto;
}

.loc-pick {
  display: grid;
  gap: 0.15rem;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.7rem;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--paper);
  cursor: pointer;
}

.loc-pick small {
  color: var(--ink-soft);
  font-size: 0.8rem;
}

.loc-list li.pending .loc-pick {
  border-color: var(--terracotta);
}

.loc-list li.active .loc-pick {
  background: white;
  border-color: var(--ink);
}

.loc-editor {
  display: grid;
  gap: 0.7rem;
  min-width: 0;
}

.loc-title {
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.loc-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));
  gap: 0.5rem;
}

@media (max-width: 899px) {
  .loc-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .loc-list {
    max-height: 220px;
  }
}

@media (max-width: 899px) {
  .loc-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .loc-list {
    max-height: 220px;
  }
}

@media (max-width: 719px) {
  .row .btn {
    width: 100%;
  }
}
</style>
