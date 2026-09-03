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

const STEPS = [
  { id: 1, title: 'Tus datos' },
  { id: 2, title: 'Quiénes necesitan' },
  { id: 3, title: 'Tallas' },
  { id: 4, title: 'Otros insumos' },
] as const

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

const form = reactive(emptyForm())
const catalog = ref<ClothingSizes>(emptySizes())
const sending = ref(false)
const ok = ref(false)
const error = ref('')
const step = ref(1)

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

const currentStep = computed(() => STEPS.find((item) => item.id === step.value) ?? STEPS[0])

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

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function validateStep(current: number): string | null {
  if (current === 1) {
    if (form.fullName.trim().length < 2) return 'Escribe tu nombre completo.'
    if (form.phoneWhatsapp.trim().length < 7) return 'Escribe un celular / WhatsApp válido.'
    if (form.residenceBefore.trim().length < 3) return 'Indica la residencia de antes del terremoto.'
    if (form.residenceAfter.trim().length < 3) return 'Indica la residencia o albergue actual.'
  }
  if (current === 2) {
    if (!form.affectationType) return 'Elige el tipo de afectación.'
    if (peopleCount.value < 1) {
      return 'Indica cuántas mujeres, hombres, niñas, niños y bebés necesitan ropa.'
    }
  }
  if (current === 4 && form.needsDiapers === 'si' && form.diaperStages.length === 0) {
    return 'Elige la etapa de pañal que necesitas.'
  }
  return null
}

function goNext() {
  const message = validateStep(step.value)
  if (message) {
    error.value = message
    return
  }
  error.value = ''
  if (step.value < STEPS.length) {
    step.value += 1
    scrollTop()
  }
}

function goBack() {
  error.value = ''
  if (step.value > 1) {
    step.value -= 1
    scrollTop()
  }
}

async function submit() {
  const lastCheck = validateStep(4)
  if (lastCheck) {
    error.value = lastCheck
    return
  }
  sending.value = true
  error.value = ''
  ok.value = false
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
    scrollTop()
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
      Completa este formulario si necesitas donaciones de ropa u otros insumos. Va por pasos para
      que no se haga tan largo. A la dirección posterior al terremoto enviaremos los paquetes.
    </p>

    <ol class="progress" aria-label="Pasos del formulario">
      <li v-for="item in STEPS" :key="item.id" :class="{ current: step === item.id, done: step > item.id }">
        <span class="num">{{ item.id }}</span>
        <span class="title">{{ item.title }}</span>
      </li>
    </ol>
    <p class="step-label">Paso {{ currentStep.id }} de {{ STEPS.length }}: {{ currentStep.title }}</p>

    <form class="card form" @submit.prevent="submit">
      <fieldset v-if="step === 1">
        <legend>Datos de contacto</legend>
        <label class="field">
          <span>Nombre completo</span>
          <input v-model="form.fullName" minlength="2" autocomplete="name" />
        </label>
        <label class="field">
          <span>Celular / WhatsApp</span>
          <input v-model="form.phoneWhatsapp" minlength="7" type="tel" autocomplete="tel" />
        </label>
      </fieldset>

      <fieldset v-if="step === 1">
        <legend>Residencia</legend>
        <label class="field">
          <span>Lugar de residencia (antes del terremoto)</span>
          <input v-model="form.residenceBefore" minlength="3" />
        </label>
        <label class="field">
          <span>Lugar de residencia o albergue (después del terremoto)</span>
          <input
            v-model="form.residenceAfter"
            minlength="3"
            placeholder="A esta dirección enviaríamos los paquetes de ropa"
          />
        </label>
      </fieldset>

      <fieldset v-if="step === 2">
        <legend>Afectación y alcance</legend>
        <label class="field">
          <span>Tipo de afectación sufrida</span>
          <select v-model="form.affectationType">
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
          <select v-model="form.clothingScope">
            <option value="familiar">Sólo para mi núcleo familiar</option>
            <option value="comunidad">También para mi comunidad</option>
          </select>
        </label>
        <p class="hint">¿Cuántas personas de cada grupo necesitan ropa? Pon 0 si no aplica.</p>
        <div class="people-grid">
          <label class="field">
            <span>Mujeres adultas</span>
            <input v-model.number="form.womenCount" type="number" min="0" max="200" />
          </label>
          <label class="field">
            <span>Hombres adultos</span>
            <input v-model.number="form.menCount" type="number" min="0" max="200" />
          </label>
          <label class="field">
            <span>Niñas</span>
            <input v-model.number="form.girlsCount" type="number" min="0" max="200" />
          </label>
          <label class="field">
            <span>Niños</span>
            <input v-model.number="form.boysCount" type="number" min="0" max="200" />
          </label>
          <label class="field">
            <span>Bebés</span>
            <input v-model.number="form.babiesCount" type="number" min="0" max="200" />
          </label>
        </div>
        <p class="total">Total: {{ peopleCount }} persona{{ peopleCount === 1 ? '' : 's' }}</p>
        <label class="field">
          <span>¿Tiene transporte propio para recoger la ropa?</span>
          <select v-model="form.hasOwnTransport">
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </label>
      </fieldset>

      <fieldset v-if="step === 3">
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

      <fieldset v-if="step === 4">
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
      <p v-if="ok && step === 1" class="flash flash-ok">
        Solicitud recibida. Un voluntario la tomará en proceso.
      </p>
      <div class="step-nav">
        <button v-if="step > 1" class="btn btn-ghost" type="button" @click="goBack">Atrás</button>
        <button v-if="step < STEPS.length" class="btn btn-primary" type="button" @click="goNext">
          Continuar
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
  list-style: none;
  margin: 1.2rem 0 0.4rem;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}

.progress li {
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  color: var(--ink-soft);
  text-align: center;
}

.progress .num {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  background: #fff;
}

.progress .title {
  font-size: 0.72rem;
  line-height: 1.2;
}

.progress li.current {
  color: var(--ink);
}

.progress li.current .num {
  border-color: var(--terracotta);
  background: var(--terracotta);
  color: #fff;
}

.progress li.done .num {
  border-color: var(--terracotta);
  background: color-mix(in srgb, var(--terracotta) 18%, white);
}

.step-label {
  font-weight: 600;
  margin: 0 0 0.2rem;
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

.step-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: flex-end;
}

@media (max-width: 560px) {
  .progress .title {
    display: none;
  }
}
</style>
