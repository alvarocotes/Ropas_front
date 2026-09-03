<script setup lang="ts">
import { reactive, computed, onMounted, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { ClothingAudience, ClothingSizes } from '@/types'
import { clothingAudienceLabel } from '@/types'

const DIAPER_STAGES = [
  'Recién nacido',
  'Etapa 1',
  'Etapa 2',
  'Etapa 3',
  'Etapa 4',
  'Etapa 5',
  'Etapa 6',
]

const emptySizes = (): ClothingSizes => ({
  woman: [],
  man: [],
  girl: [],
  boy: [],
  baby: [],
})

type SizeQty = Record<string, Record<string, number>>

const emptyQty = (): SizeQty => ({})

const emptyForm = () => ({
  fullName: '',
  residenceBefore: '',
  residenceAfter: '',
  phoneWhatsapp: '',
  affectationType: '',
  clothingScope: 'familiar' as 'familiar' | 'comunidad',
  womenCount: 0,
  menCount: 0,
  girlsCount: 0,
  boysCount: 0,
  babiesCount: 0,
  hasOwnTransport: 'no' as 'si' | 'no',
  womanSizes: emptyQty(),
  manSizes: emptyQty(),
  girlSizes: emptyQty(),
  boySizes: emptyQty(),
  babySizes: emptyQty(),
  underwearNeeds: '',
  needsLinens: 'no' as 'si' | 'no',
  needsDiapers: 'no' as 'si' | 'no',
  diaperStages: [] as string[],
  needsSanitary: 'no' as 'si' | 'no',
  additionalNeeds: '',
})

const STEPS = [
  { title: 'Contacto', hint: 'Cómo te localizamos' },
  { title: 'Residencia', hint: 'Dónde enviar la ayuda' },
  { title: 'Personas', hint: 'Quiénes necesitan ropa' },
  { title: 'Tallas', hint: 'Ropa por grupo' },
  { title: 'Insumos', hint: 'Pañales, sábanas y más' },
] as const

const LAST_STEP = STEPS.length

const form = reactive(emptyForm())
const catalog = ref<ClothingSizes>(emptySizes())
const sending = ref(false)
const ok = ref(false)
const error = ref('')
const step = ref(1)
const formEl = ref<HTMLFormElement | null>(null)

const sizeGroups: {
  count: () => number
  key: ClothingAudience
  qty: () => SizeQty
}[] = [
  { count: () => asCount(form.womenCount), key: 'woman', qty: () => form.womanSizes },
  { count: () => asCount(form.menCount), key: 'man', qty: () => form.manSizes },
  { count: () => asCount(form.girlsCount), key: 'girl', qty: () => form.girlSizes },
  { count: () => asCount(form.boysCount), key: 'boy', qty: () => form.boySizes },
  { count: () => asCount(form.babiesCount), key: 'baby', qty: () => form.babySizes },
]

onMounted(async () => {
  try {
    const { data } = await api.get<ClothingSizes>('/inventory/clothing-sizes')
    catalog.value = {
      woman: data.woman ?? [],
      man: data.man ?? [],
      girl: data.girl ?? [],
      boy: data.boy ?? [],
      baby: data.baby ?? [],
    }
  } catch {
    catalog.value = emptySizes()
  }
})

function asCount(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

const peopleCount = computed(
  () =>
    asCount(form.womenCount) +
    asCount(form.menCount) +
    asCount(form.girlsCount) +
    asCount(form.boysCount) +
    asCount(form.babiesCount),
)

function onDiapersChange() {
  if (form.needsDiapers === 'no') {
    form.diaperStages = []
  }
}

function toggleStage(stage: string) {
  const index = form.diaperStages.indexOf(stage)
  if (index >= 0) {
    form.diaperStages.splice(index, 1)
  } else {
    form.diaperStages.push(stage)
  }
}

function setSizeQty(map: Record<string, number>, size: string, value: unknown) {
  const n = asCount(value)
  if (n <= 0) delete map[size]
  else map[size] = n
}

function qtyFor(qty: SizeQty, label: string) {
  if (!qty[label]) qty[label] = {}
  return qty[label]
}

function assignedPeople(qty: SizeQty) {
  return Object.values(qty).reduce((sum, map) => sum + assignedPart(map), 0)
}

function assignedPart(map: Record<string, number>) {
  return Object.values(map).reduce((sum, n) => sum + asCount(n), 0)
}

function joinSizes(map: Record<string, number>) {
  const parts = Object.entries(map)
    .filter(([, n]) => asCount(n) > 0)
    .map(([size, n]) => `${size} × ${asCount(n)}`)
  return parts.length ? parts.join(', ') : undefined
}

function joinLabeled(qty: SizeQty) {
  const parts: string[] = []
  for (const [label, sizes] of Object.entries(qty)) {
    const chunk = joinSizes(sizes)
    if (chunk) parts.push(`${label}: ${chunk}`)
  }
  return parts.length ? parts.join(' · ') : undefined
}

function hasCatalogSizes(key: ClothingAudience) {
  return catalog.value[key].length > 0
}

function currentStepValid() {
  return Boolean(formEl.value?.reportValidity())
}

function validateStep(n: number) {
  error.value = ''
  if (n <= 3 && !currentStepValid()) return false
  if (n === 3 && peopleCount.value < 1) {
    error.value = 'Indica cuántas mujeres, hombres, niñas, niños y bebés necesitan ropa.'
    return false
  }
  if (n === 5 && form.needsDiapers === 'si' && form.diaperStages.length === 0) {
    error.value = 'Elige la etapa de pañal que necesitas.'
    return false
  }
  return true
}

function goTo(n: number) {
  step.value = n
  error.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function next() {
  if (!validateStep(step.value)) return
  if (step.value < LAST_STEP) goTo(step.value + 1)
}

function back() {
  if (step.value > 1) goTo(step.value - 1)
}

function onFormSubmit() {
  if (step.value < LAST_STEP) {
    next()
    return
  }
  void submit()
}

async function submit() {
  sending.value = true
  error.value = ''
  ok.value = false
  if (peopleCount.value < 1) {
    error.value = 'Indica cuántas mujeres, hombres, niñas, niños y bebés necesitan ropa.'
    sending.value = false
    return
  }
  if (form.needsDiapers === 'si' && form.diaperStages.length === 0) {
    error.value = 'Elige la etapa de pañal que necesitas.'
    sending.value = false
    return
  }
  try {
    await api.post('/help-requests', {
      fullName: form.fullName,
      residenceBefore: form.residenceBefore,
      residenceAfter: form.residenceAfter,
      phoneWhatsapp: form.phoneWhatsapp,
      affectationType: form.affectationType,
      clothingScope: form.clothingScope,
      womenCount: asCount(form.womenCount),
      menCount: asCount(form.menCount),
      girlsCount: asCount(form.girlsCount),
      boysCount: asCount(form.boysCount),
      babiesCount: asCount(form.babiesCount),
      peopleCount: peopleCount.value,
      hasOwnTransport: form.hasOwnTransport === 'si',
      babySizes: joinLabeled(form.babySizes),
      girlShirtSizes: joinLabeled(form.girlSizes),
      womanShirtSizes: joinLabeled(form.womanSizes),
      boyShirtSizes: joinLabeled(form.boySizes),
      manShirtSizes: joinLabeled(form.manSizes),
      underwearNeeds: form.underwearNeeds || undefined,
      needsLinens: form.needsLinens === 'si',
      needsDiapers: form.needsDiapers === 'si',
      diaperStage: form.needsDiapers === 'si' ? form.diaperStages.join(', ') : undefined,
      needsSanitary: form.needsSanitary === 'si',
      additionalNeeds: form.additionalNeeds || undefined,
    })
    ok.value = true
    Object.assign(form, emptyForm())
    step.value = 1
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo enviar la solicitud')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="page">
    <h1>Solicitar ropa y ayuda</h1>
    <p>
      Completa este formulario si necesitas donaciones de ropa u otros insumos. A la dirección
      posterior al terremoto enviaremos los paquetes. Son {{ LAST_STEP }} pasos cortos.
    </p>

    <nav class="progress" aria-label="Progreso del formulario">
      <ol>
        <li
          v-for="(item, i) in STEPS"
          :key="item.title"
          :class="{ current: step === i + 1, done: step > i + 1 }"
        >
          <span class="dot">{{ i + 1 }}</span>
          <span class="label">{{ item.title }}</span>
        </li>
      </ol>
      <p class="progress-caption">
        Paso {{ step }} de {{ LAST_STEP }} · {{ STEPS[step - 1].hint }}
      </p>
    </nav>

    <form class="card form" ref="formEl" @submit.prevent="onFormSubmit">
      <fieldset v-if="step === 1">
        <legend>Datos de contacto</legend>
        <label class="field">
          <span>Nombre completo</span>
          <input v-model="form.fullName" required minlength="2" autocomplete="name" />
        </label>
        <label class="field">
          <span>Celular / WhatsApp</span>
          <input v-model="form.phoneWhatsapp" required minlength="7" type="tel" autocomplete="tel" />
        </label>
      </fieldset>

      <fieldset v-if="step === 2">
        <legend>Residencia</legend>
        <label class="field">
          <span>Lugar de residencia (antes del terremoto)</span>
          <input v-model="form.residenceBefore" required minlength="3" />
        </label>
        <label class="field">
          <span>Lugar de residencia o albergue (después del terremoto)</span>
          <input
            v-model="form.residenceAfter"
            required
            minlength="3"
            placeholder="A esta dirección enviaríamos los paquetes de ropa"
          />
        </label>
      </fieldset>

      <fieldset v-if="step === 3">
        <legend>Afectación y alcance</legend>
        <label class="field">
          <span>Tipo de afectación sufrida</span>
          <select v-model="form.affectationType" required>
            <option value="" disabled>Selecciona una opción</option>
            <option>Vivienda destruida</option>
            <option>Vivienda inhabitables o dañada</option>
            <option>Pérdida de enseres</option>
            <option>Pérdida de empleo</option>
            <option>Desplazados / en albergue</option>
            <option>Personas heridas en el núcleo familiar</option>
            <option>Otra</option>
          </select>
        </label>
        <label class="field">
          <span>¿Necesitas ropa sólo para tu núcleo familiar o también para tu comunidad?</span>
          <select v-model="form.clothingScope" required>
            <option value="familiar">Sólo para mi núcleo familiar</option>
            <option value="comunidad">También para mi comunidad</option>
          </select>
        </label>
        <p class="hint">¿Cuántas personas de cada grupo necesitan ropa? Pon 0 si no aplica.</p>
        <div class="people-grid">
          <label class="field">
            <span>Mujeres adultas</span>
            <input v-model.number="form.womenCount" type="number" min="0" max="200" required />
          </label>
          <label class="field">
            <span>Hombres adultos</span>
            <input v-model.number="form.menCount" type="number" min="0" max="200" required />
          </label>
          <label class="field">
            <span>Niñas</span>
            <input v-model.number="form.girlsCount" type="number" min="0" max="200" required />
          </label>
          <label class="field">
            <span>Niños</span>
            <input v-model.number="form.boysCount" type="number" min="0" max="200" required />
          </label>
          <label class="field">
            <span>Bebés</span>
            <input v-model.number="form.babiesCount" type="number" min="0" max="200" required />
          </label>
        </div>
        <p class="total">Total: {{ peopleCount }} persona{{ peopleCount === 1 ? '' : 's' }}</p>
        <label class="field">
          <span>¿Tiene transporte propio para recoger la ropa?</span>
          <select v-model="form.hasOwnTransport" required>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </label>
      </fieldset>

      <fieldset v-if="step === 4">
        <legend>Tallas de ropa</legend>
        <p class="hint">
          En cada talla indica para cuántas personas es. Los títulos (blusa, camisa, inferior…)
          salen como los configuró el inventario.
        </p>
        <template v-for="group in sizeGroups" :key="group.key">
          <fieldset v-if="group.count() > 0" class="stages">
            <legend>Tallas de {{ clothingAudienceLabel[group.key].toLowerCase() }}</legend>
            <p v-if="!hasCatalogSizes(group.key)" class="hint">
              Aún no hay tallas de {{ clothingAudienceLabel[group.key].toLowerCase() }} en
              inventario.
            </p>
            <template v-else>
              <p class="hint">
                {{ assignedPeople(group.qty()) }} de {{ group.count() }} persona{{
                  group.count() === 1 ? '' : 's'
                }}
                con talla.
              </p>
              <div
                v-for="offer in catalog[group.key]"
                :key="offer.label"
                class="garment-block"
              >
                <h3>{{ offer.label }}</h3>
                <div class="size-qty">
                  <label v-for="size in offer.sizes" :key="`${offer.label}-${size}`" class="qty-row">
                    <span>{{ size }}</span>
                    <input
                      type="number"
                      min="0"
                      :max="group.count()"
                      :value="qtyFor(group.qty(), offer.label)[size] || 0"
                      :aria-label="`${offer.label} talla ${size}`"
                      @input="
                        setSizeQty(
                          qtyFor(group.qty(), offer.label),
                          size,
                          ($event.target as HTMLInputElement).value,
                        )
                      "
                    />
                    <small>personas</small>
                  </label>
                </div>
              </div>
            </template>
          </fieldset>
        </template>
        <label class="field">
          <span>¿Qué tipo de ropa interior necesitas?</span>
          <input v-model="form.underwearNeeds" placeholder="Ej. interiores de mujer talla M, niños 8 años…" />
        </label>
      </fieldset>

      <fieldset v-if="step === 5">
        <legend>Otros insumos</legend>
        <label class="field">
          <span>¿Necesitas sábanas, cobijas y toallas?</span>
          <select v-model="form.needsLinens">
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </label>
        <label class="field">
          <span>¿Necesitas pañales?</span>
          <select v-model="form.needsDiapers" @change="onDiapersChange">
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </label>
        <fieldset v-if="form.needsDiapers === 'si'" class="stages">
          <legend>Etapa de pañal</legend>
          <p class="hint">Marca las que necesites si hay varios niños.</p>
          <div class="stage-grid">
            <label v-for="stage in DIAPER_STAGES" :key="stage" class="check">
              <input
                type="checkbox"
                :checked="form.diaperStages.includes(stage)"
                @change="toggleStage(stage)"
              />
              <span>{{ stage }}</span>
            </label>
          </div>
        </fieldset>
        <label class="field">
          <span>¿Necesitas toallas higiénicas y protectores?</span>
          <select v-model="form.needsSanitary">
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </label>
        <label class="field">
          <span>¿Necesitas algo más que podamos intentar gestionar?</span>
          <textarea
            v-model="form.additionalNeeds"
            placeholder="Otras tallas, colchonetas, zapatos, kits básicos de aseo personal…"
          />
        </label>
      </fieldset>

      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <p v-if="ok" class="flash flash-ok">Solicitud recibida. Un voluntario la tomará en proceso.</p>
      <div class="wizard-nav">
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="step === 1 || sending"
          @click="back"
        >
          Atrás
        </button>
        <button v-if="step < LAST_STEP" class="btn btn-primary" type="submit">
          Siguiente
        </button>
        <button v-else class="btn btn-primary" type="submit" :disabled="sending">
          {{ sending ? 'Enviando...' : 'Enviar solicitud' }}
        </button>
      </div>
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

.progress {
  margin: 1.2rem 0 0;
}

.progress ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.35rem;
}

.progress li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.72rem;
  font-weight: 600;
}

.progress .dot {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 2px solid var(--line);
  background: #fff;
  font-size: 0.85rem;
}

.progress li.done .dot,
.progress li.current .dot {
  border-color: var(--terracotta);
  background: var(--terracotta);
  color: #fff;
}

.progress li.current .label {
  color: var(--ink);
}

.progress-caption {
  margin: 0.7rem 0 0;
  color: var(--ink-soft);
  font-size: 0.92rem;
}

@media (max-width: 560px) {
  .progress .label {
    display: none;
  }
}

.form {
  margin-top: 1.1rem;
  padding: 1.1rem;
  display: grid;
  gap: 1.2rem;
}

.wizard-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
}

.wizard-nav .btn-primary {
  justify-self: stretch;
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
  cursor: pointer;
  min-height: 44px;
}

.check input {
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 auto;
  accent-color: var(--terracotta);
}

.stages {
  padding-top: 0.4rem;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: 0.35rem 0.8rem;
}

.size-qty {
  display: grid;
  gap: 0.45rem;
}

.garment-block h3 {
  font-size: 1rem;
  text-transform: none;
  margin: 0.35rem 0 0.35rem;
}

.qty-row {
  display: grid;
  grid-template-columns: minmax(3.5rem, 1fr) 5.5rem auto;
  align-items: center;
  gap: 0.65rem;
  min-height: 44px;
}

.qty-row span {
  font-weight: 700;
}

.qty-row input {
  width: 100%;
  min-height: 44px;
  text-align: center;
}

.qty-row small {
  color: var(--ink-soft);
}

.people-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
}

.total {
  font-weight: 600;
  margin: 0;
}
</style>
