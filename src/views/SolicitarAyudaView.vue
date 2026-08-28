<script setup lang="ts">
import { reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'

const emptyForm = () => ({
  fullName: '',
  identificationNumber: '',
  residenceBefore: '',
  residenceAfter: '',
  phoneWhatsapp: '',
  affectationType: '',
  clothingScope: 'familiar' as 'familiar' | 'comunidad',
  peopleCount: 1,
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
  needsSanitary: 'no' as 'si' | 'no',
  additionalNeeds: '',
})

const form = reactive(emptyForm())
const sending = ref(false)
const ok = ref(false)
const error = ref('')

async function submit() {
  sending.value = true
  error.value = ''
  ok.value = false
  try {
    await api.post('/help-requests', {
      ...form,
      hasOwnTransport: form.hasOwnTransport === 'si',
      needsLinens: form.needsLinens === 'si',
      needsDiapers: form.needsDiapers === 'si',
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
        <div class="grid-2">
          <label class="field">
            <span>Número de identificación</span>
            <input v-model="form.identificationNumber" required minlength="4" />
          </label>
          <label class="field">
            <span>Celular / WhatsApp</span>
            <input v-model="form.phoneWhatsapp" required minlength="7" type="tel" autocomplete="tel" />
          </label>
        </div>
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
        <div class="grid-2">
          <label class="field">
            <span>Número aproximado de personas que necesitan ropa</span>
            <input v-model.number="form.peopleCount" type="number" min="1" required />
          </label>
          <label class="field">
            <span>¿Tiene transporte propio para recoger la ropa?</span>
            <select v-model="form.hasOwnTransport" required>
              <option value="no">No</option>
              <option value="si">Sí</option>
            </select>
          </label>
        </div>
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
          <select v-model="form.needsDiapers">
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </label>
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
</style>
