<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import type { PublicNeed } from '@/types'

const needs = ref<PublicNeed[]>([])
const form = reactive({
  donorName: '',
  contact: '',
  notes: '',
  items: [{ productName: '', quantity: 1, productId: undefined as number | undefined }],
})
const sending = ref(false)
const ok = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get<PublicNeed[]>('/needs')
    needs.value = data
  } catch {
    needs.value = []
  }
})

function addItem() {
  form.items.push({ productName: '', quantity: 1, productId: undefined })
}

function fillFromNeed(need: PublicNeed) {
  const empty = form.items.find((item) => !item.productName)
  const target = empty ?? form.items[0]
  if (!target) return
  target.productName = need.title
  target.quantity = need.quantityNeeded
  target.productId = need.productId ?? undefined
}

async function submit() {
  sending.value = true
  error.value = ''
  ok.value = false
  try {
    await api.post('/donations', {
      donorName: form.donorName || undefined,
      contact: form.contact || undefined,
      notes: form.notes || undefined,
      items: form.items.filter((item) => item.productName.trim()),
    })
    ok.value = true
    form.donorName = ''
    form.contact = ''
    form.notes = ''
    form.items = [{ productName: '', quantity: 1, productId: undefined }]
  } catch (err) {
    error.value = apiErrorMessage(err, 'No se pudo registrar la donación')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="page">
    <h1>Registrar una donación</h1>
    <p>Indica qué vas a entregar. El equipo confirmará la recepción e ingresará los productos al inventario.</p>

    <div v-if="needs.length" class="hints">
      <p>Sugerencias actuales:</p>
      <button v-for="need in needs" :key="need.id" class="chip" type="button" @click="fillFromNeed(need)">
        {{ need.title }}
      </button>
    </div>

    <form class="card form" @submit.prevent="submit">
      <div class="grid-2">
        <label class="field">
          <span>Tu nombre (opcional)</span>
          <input v-model="form.donorName" />
        </label>
        <label class="field">
          <span>Contacto (opcional)</span>
          <input v-model="form.contact" />
        </label>
      </div>

      <div v-for="(item, index) in form.items" :key="index" class="item grid-2">
        <label class="field">
          <span>Producto</span>
          <input v-model="item.productName" required />
        </label>
        <label class="field">
          <span>Cantidad</span>
          <input v-model.number="item.quantity" type="number" min="1" required />
        </label>
      </div>
      <button class="btn btn-ghost" type="button" @click="addItem">Agregar otro producto</button>

      <label class="field">
        <span>Notas</span>
        <textarea v-model="form.notes" placeholder="Punto de entrega, horario u otra indicación." />
      </label>

      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <p v-if="ok" class="flash flash-ok">Donación registrada. Gracias por sumarte.</p>
      <button class="btn btn-primary" type="submit" :disabled="sending">
        {{ sending ? 'Enviando...' : 'Enviar donación' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

h1 {
  font-size: clamp(1.7rem, 8vw, 3rem);
  margin-bottom: 0.5rem;
}

.hints {
  margin: 1.2rem 0;
}

.chip {
  border: 1px solid var(--line);
  background: white;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  margin: 0.25rem 0.35rem 0 0;
  min-height: 44px;
}

.form {
  padding: 1.3rem;
  display: grid;
  gap: 1rem;
}
</style>
