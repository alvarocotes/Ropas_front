<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import StatusBadge from '@/components/StatusBadge.vue'
import type { Product, PublicNeed } from '@/types'

const needs = ref<PublicNeed[]>([])
const products = ref<Product[]>([])
const error = ref('')
const form = reactive({
  title: '',
  quantityNeeded: 1,
  message: '',
  productId: 0,
  isVisible: true,
})

async function load() {
  try {
    const [needRes, productRes] = await Promise.all([
      api.get<PublicNeed[]>('/needs/admin'),
      api.get<Product[]>('/inventory/products'),
    ])
    needs.value = needRes.data
    products.value = productRes.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

async function createNeed() {
  error.value = ''
  try {
    await api.post('/needs', {
      title: form.title,
      quantityNeeded: form.quantityNeeded,
      message: form.message || undefined,
      productId: form.productId || undefined,
      isVisible: form.isVisible,
    })
    form.title = ''
    form.message = ''
    form.quantityNeeded = 1
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

async function toggle(need: PublicNeed) {
  await api.patch(`/needs/${need.id}`, { isVisible: !need.isVisible })
  await load()
}
</script>

<template>
  <section>
    <h1>Necesidades públicas</h1>
    <p class="lead">Lo que publiques aquí se muestra en la web para orientar donaciones.</p>
    <p v-if="error" class="flash flash-error">{{ error }}</p>

    <form class="card form" @submit.prevent="createNeed">
      <h2>Publicar necesidad</h2>
      <label class="field"><span>Título</span><input v-model="form.title" required /></label>
      <label class="field">
        <span>Producto del inventario (opcional)</span>
        <select v-model.number="form.productId">
          <option :value="0">Ninguno</option>
          <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
        </select>
      </label>
      <label class="field"><span>Cantidad orientativa</span><input v-model.number="form.quantityNeeded" type="number" min="1" /></label>
      <label class="field"><span>Mensaje</span><textarea v-model="form.message" /></label>
      <label class="check"><input v-model="form.isVisible" type="checkbox" /> Visible al público</label>
      <button class="btn btn-primary" type="submit">Publicar</button>
    </form>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Cantidad</th>
            <th>Visible</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="need in needs" :key="need.id">
            <td data-label="Título">{{ need.title }}</td>
            <td data-label="Cantidad">{{ need.quantityNeeded }}</td>
            <td data-label="Visible">
              <StatusBadge :tone="need.isVisible ? 'listo' : 'cancelado'" :label="need.isVisible ? 'Visible' : 'Oculta'" />
            </td>
            <td>
              <button class="btn btn-ghost" type="button" @click="toggle(need)">
                {{ need.isVisible ? 'Ocultar' : 'Mostrar' }}
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
.check { display: flex; gap: 0.5rem; align-items: center; }
</style>
