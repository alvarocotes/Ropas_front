<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import StatusBadge from '@/components/StatusBadge.vue'
import type { InventoryMovement, Product } from '@/types'

const products = ref<Product[]>([])
const movements = ref<InventoryMovement[]>([])
const error = ref('')
const productForm = reactive({
  name: '',
  unit: 'unidad',
  quantity: 0,
  minQuantity: 5,
  publishWhenLow: false,
  publicNote: '',
})
const movementForm = reactive({ productId: 0, type: 'entrada' as 'entrada' | 'salida', quantity: 1, note: '' })
/** Cantidad a sumar o restar desde la tarjeta de cada producto. */
const amounts = reactive<Record<number, number>>({})
const busyId = ref<number | null>(null)
const search = ref('')
const onlyLow = ref(false)

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return products.value.filter((product) => {
    if (onlyLow.value && !isLow(product)) return false
    if (!term) return true
    return `${product.name} ${product.unit}`.toLowerCase().includes(term)
  })
})

async function load() {
  try {
    const [productRes, movementRes] = await Promise.all([
      api.get<Product[]>('/inventory/products'),
      api.get<InventoryMovement[]>('/inventory/movements'),
    ])
    products.value = productRes.data
    movements.value = movementRes.data
    for (const product of products.value) {
      if (!amounts[product.id]) {
        amounts[product.id] = 1
      }
    }
    if (!movementForm.productId && products.value[0]) {
      movementForm.productId = products.value[0].id
    }
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

async function createProduct() {
  error.value = ''
  try {
    await api.post('/inventory/products', productForm)
    productForm.name = ''
    productForm.quantity = 0
    productForm.publicNote = ''
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

async function registerMovement() {
  error.value = ''
  try {
    await api.post('/inventory/movements', movementForm)
    movementForm.quantity = 1
    movementForm.note = ''
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

async function changeStock(product: Product, type: 'entrada' | 'salida') {
  const quantity = Number(amounts[product.id]) || 0
  if (quantity < 1) {
    error.value = 'Escribe una cantidad mayor que cero.'
    return
  }
  error.value = ''
  busyId.value = product.id
  try {
    await api.post('/inventory/movements', { productId: product.id, type, quantity })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busyId.value = null
  }
}

async function saveMin(product: Product, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  await api.patch(`/inventory/products/${product.id}`, { minQuantity: value })
  await load()
}

async function togglePublish(product: Product) {
  error.value = ''
  try {
    await api.patch(`/inventory/products/${product.id}`, {
      publishWhenLow: !product.publishWhenLow,
    })
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

function isLow(product: Product) {
  return product.quantity < product.minQuantity
}
</script>

<template>
  <section>
    <h1>Inventario</h1>
    <p class="lead">Entradas, salidas y alertas cuando el stock baja del mínimo.</p>
    <p v-if="error" class="flash flash-error">{{ error }}</p>

    <div class="grid-2">
      <form class="card form" @submit.prevent="createProduct">
        <h2>Nuevo producto</h2>
        <label class="field"><span>Nombre</span><input v-model="productForm.name" required /></label>
        <label class="field"><span>Unidad</span><input v-model="productForm.unit" /></label>
        <label class="field"><span>Cantidad inicial</span><input v-model.number="productForm.quantity" type="number" min="0" /></label>
        <label class="field"><span>Mínimo para alerta</span><input v-model.number="productForm.minQuantity" type="number" min="0" /></label>
        <label class="check">
          <input v-model="productForm.publishWhenLow" type="checkbox" />
          <span>Publicar en necesidades públicas cuando el stock baje del mínimo</span>
        </label>
        <label v-if="productForm.publishWhenLow" class="field">
          <span>Mensaje para los donantes (opcional)</span>
          <input v-model="productForm.publicNote" maxlength="300" placeholder="Ej.: Necesitamos cobijas de tamaño individual" />
        </label>
        <button class="btn btn-primary" type="submit">Crear</button>
      </form>

      <form class="card form" @submit.prevent="registerMovement">
        <h2>Movimiento con nota</h2>
        <p class="hint">Para entradas o salidas que necesiten dejar un detalle escrito.</p>
        <label class="field">
          <span>Producto</span>
          <select v-model.number="movementForm.productId" required>
            <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>Tipo</span>
          <select v-model="movementForm.type">
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </label>
        <label class="field"><span>Cantidad</span><input v-model.number="movementForm.quantity" type="number" min="1" required /></label>
        <label class="field"><span>Nota</span><input v-model="movementForm.note" /></label>
        <button class="btn btn-forest" type="submit">Guardar movimiento</button>
      </form>
    </div>

    <div class="block-head">
      <h2>Existencias</h2>
      <p class="hint">
        Escribe la cantidad y pulsa <strong>+</strong> para sumarla al stock, o <strong>−</strong>
        para descontarla. Cada cambio queda registrado como movimiento.
      </p>
      <div class="toolbar">
        <div class="search">
          <input
            v-model="search"
            type="search"
            placeholder="Buscar producto…"
            aria-label="Buscar producto"
          />
          <button v-if="search" class="clear" type="button" aria-label="Limpiar búsqueda" @click="search = ''">
            ×
          </button>
        </div>
        <label class="check">
          <input v-model="onlyLow" type="checkbox" />
          <span>Solo stock bajo</span>
        </label>
        <small class="count">{{ filteredProducts.length }} de {{ products.length }}</small>
      </div>
    </div>

    <div v-if="products.length === 0" class="card empty">
      Todavía no hay productos. Crea el primero con el formulario de arriba.
    </div>
    <div v-else-if="filteredProducts.length === 0" class="card empty">
      Ningún producto coincide con la búsqueda.
    </div>
    <div v-else class="stock-grid">
      <article
        v-for="product in filteredProducts"
        :key="product.id"
        class="card stock"
        :class="{ low: isLow(product) }"
      >
        <header>
          <h3>{{ product.name }}</h3>
          <StatusBadge v-if="isLow(product)" tone="alerta" label="Stock bajo" />
          <StatusBadge v-else tone="listo" label="OK" />
        </header>

        <div class="figure">
          <strong>{{ product.quantity }}</strong>
          <span>{{ product.unit }}</span>
        </div>

        <div class="counter">
          <button
            class="step"
            type="button"
            :disabled="busyId === product.id"
            aria-label="Restar del stock"
            @click="changeStock(product, 'salida')"
          >
            −
          </button>
          <input
            v-model.number="amounts[product.id]"
            class="amount"
            type="number"
            min="1"
            inputmode="numeric"
            aria-label="Cantidad"
          />
          <button
            class="step add"
            type="button"
            :disabled="busyId === product.id"
            aria-label="Sumar al stock"
            @click="changeStock(product, 'entrada')"
          >
            +
          </button>
        </div>

        <label class="min-row">
          <span>Mínimo para alerta</span>
          <input
            class="mini"
            type="number"
            min="0"
            :value="product.minQuantity"
            @change="saveMin(product, $event)"
          />
        </label>

        <label class="check">
          <input
            type="checkbox"
            :checked="product.publishWhenLow"
            @change="togglePublish(product)"
          />
          <span>
            Pedir al público:
            {{
              product.publishWhenLow
                ? isLow(product)
                  ? 'visible ahora'
                  : 'se publicará si baja'
                : 'no publicar'
            }}
          </span>
        </label>
      </article>
    </div>

    <div class="card table-wrap block">
      <h2>Últimos movimientos</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Por</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="movement in movements" :key="movement.id">
            <td data-label="Fecha">{{ new Date(movement.createdAt).toLocaleString('es') }}</td>
            <td data-label="Producto">{{ movement.product?.name }}</td>
            <td data-label="Tipo">{{ movement.type }}</td>
            <td data-label="Cantidad">{{ movement.quantity }}</td>
            <td data-label="Por">{{ movement.user?.fullName }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead { color: var(--ink-soft); margin-bottom: 1rem; }
.form, .block { padding: 1.1rem; margin-top: 1rem; display: grid; gap: 0.8rem; }
.mini { width: 90px; border: 1px solid var(--line); border-radius: 8px; padding: 0.3rem 0.4rem; }
.hint { color: var(--ink-soft); font-size: 0.9rem; margin: -0.3rem 0 0.2rem; }
.block-head { margin-top: 1.6rem; }
.block-head h2 { margin-bottom: 0.25rem; }
.empty { padding: 1.1rem; color: var(--ink-soft); margin-top: 0.6rem; }

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
  margin-top: 0.7rem;
}

.search {
  position: relative;
  flex: 1 1 220px;
  min-width: 0;
}

.search input {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--line);
  background: white;
  border-radius: 12px;
  padding: 0.6rem 2.2rem 0.6rem 0.85rem;
  font-size: 16px;
}

.search input::-webkit-search-cancel-button {
  display: none;
}

.clear {
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-soft);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

.count {
  color: var(--ink-soft);
  white-space: nowrap;
}

.stock-grid {
  display: grid;
  gap: 0.9rem;
  margin-top: 0.8rem;
  /* min() evita que una columna fija desborde en pantallas muy estrechas. */
  grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
}

.stock {
  padding: 1rem;
  display: grid;
  gap: 0.7rem;
  align-content: start;
  min-width: 0;
}

.stock * {
  min-width: 0;
}

.stock.low {
  border-color: rgba(193, 90, 55, 0.45);
}

.stock header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.stock h3 {
  font-family: var(--display);
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}

.figure {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.figure strong {
  font-family: var(--display);
  font-size: 2.1rem;
  line-height: 1;
}

.figure span {
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.stock .counter {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: stretch;
  gap: 0.4rem;
  max-width: 100%;
}

.step {
  flex: 0 0 48px;
  width: 48px;
  min-height: 48px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
}

.step:disabled {
  opacity: 0.5;
  cursor: default;
}

.step.add {
  background: var(--terracotta);
  border-color: var(--terracotta);
  color: white;
  font-weight: 700;
}

.stock .amount {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  text-align: center;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.3rem 0.4rem;
  font-size: 16px;
}

/* Las flechas nativas roban ancho y descuadran la fila. */
.stock input[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
}

.stock input[type='number']::-webkit-outer-spin-button,
.stock input[type='number']::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.stock .min-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  cursor: pointer;
}

.stock .min-row span {
  color: var(--ink-soft);
  font-size: 0.85rem;
  font-weight: 600;
}

.stock .min-row .mini {
  flex: 0 0 88px;
  width: 88px;
  min-height: 40px;
  text-align: center;
  background: white;
  font-size: 16px;
  padding: 0.3rem 0.4rem;
}
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.3;
  cursor: pointer;
}
.check input {
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 auto;
  accent-color: var(--terracotta);
}
@media (max-width: 719px) {
  .mini { width: 100%; max-width: 140px; min-height: 44px; }
}
</style>
