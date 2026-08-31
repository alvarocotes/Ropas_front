<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'

const DIAPER_STAGES = [
  'Recién nacido',
  'Etapa 1',
  'Etapa 2',
  'Etapa 3',
  'Etapa 4',
  'Etapa 5',
  'Etapa 6',
]

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
  babySizes: '',
  girlShirtSizes: '',
  girlPantsSizes: '',
  womanShirtSizes: '',
  womanPantsSizes: '',
  boyShirtSizes: '',
  boyPantsSizes: '',
  manShirtSizes: '',
  manPantsSizes: '',
  underwearNeeds: '',
  needsLinens: 'no' as 'si' | 'no',
  needsDiapers: 'no' as 'si' | 'no',
  diaperStages: [] as string[],
  needsSanitary: 'no' as 'si' | 'no',
  additionalNeeds: '',
})

const form = reactive(emptyForm())
const sending = ref(false)
const ok = ref(false)
const error = ref('')

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
    const { diaperStages, ...fields } = form
    await api.post('/help-requests', {
      ...fields,
      womenCount: asCount(form.womenCount),
      menCount: asCount(form.menCount),
      girlsCount: asCount(form.girlsCount),
      boysCount: asCount(form.boysCount),
      babiesCount: asCount(form.babiesCount),
      peopleCount: peopleCount.value,
      hasOwnTransport: form.hasOwnTransport === 'si',
      needsLinens: form.needsLinens === 'si',
      needsDiapers: form.needsDiapers === 'si',
      diaperStage: form.needsDiapers === 'si' ? diaperStages.join(', ') : undefined,
      needsSanitary: form.needsSanitary === 'si',
    })
    ok.value = true
    Object.assign(form, emptyForm())
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
      posterior al terremoto enviaremos los paquetes.
    </p>

    <form class="card form" @submit.prevent="submit">
      <fieldset>
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

      <fieldset>
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

      <fieldset>
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

      <fieldset>
        <legend>Tallas de ropa</legend>
        <p class="hint">Si no aplica, déjalo en blanco. Puedes escribir varias: 2, 4, M, L…</p>
        <label class="field">
          <span>Talla(s) / edad(es) para ropa de bebé</span>
          <input v-model="form.babySizes" />
        </label>
        <div class="grid-2">
          <label class="field">
            <span>Camisas / camisetas de niña</span>
            <input v-model="form.girlShirtSizes" />
          </label>
          <label class="field">
            <span>Pantalones de niña</span>
            <input v-model="form.girlPantsSizes" />
          </label>
          <label class="field">
            <span>Blusas / camisas / camisetas de mujer</span>
            <input v-model="form.womanShirtSizes" />
          </label>
          <label class="field">
            <span>Pantalones de mujer</span>
            <input v-model="form.womanPantsSizes" />
          </label>
          <label class="field">
            <span>Camisas / camisetas de niño</span>
            <input v-model="form.boyShirtSizes" />
          </label>
          <label class="field">
            <span>Pantalones de niño</span>
            <input v-model="form.boyPantsSizes" />
          </label>
          <label class="field">
            <span>Camisas / camisetas de hombre</span>
            <input v-model="form.manShirtSizes" />
          </label>
          <label class="field">
            <span>Pantalones de hombre</span>
            <input v-model="form.manPantsSizes" />
          </label>
        </div>
        <label class="field">
          <span>¿Qué tipo de ropa interior necesitas?</span>
          <input v-model="form.underwearNeeds" placeholder="Ej. interiores de mujer talla M, niños 8 años…" />
        </label>
      </fieldset>

      <fieldset>
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
      <button class="btn btn-primary" type="submit" :disabled="sending">
        {{ sending ? 'Enviando...' : 'Enviar solicitud' }}
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
