<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import OverlayCard from '@/components/OverlayCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useLiveReload } from '@/composables/useLiveReload'
import { useAuthStore } from '@/stores/auth'
import type { ClothingAudience, Product } from '@/types'
import { clothingAudienceLabel } from '@/types'

const auth = useAuthStore()
const products = ref<Product[]>([])
const error = ref('')
const showCreate = ref(false)
const productForm = reactive({
  name: '',
  unit: 'unidad',
  quantity: 0,
  minQuantity: 5,
  publishWhenLow: false,
  publicNote: '',
  audience: '' as ClothingAudience | '',
  sizeLabel: '',
})
const busyId = ref<number | null>(null)
const stockMove = ref<{
  productId: number
  name: string
  unit: string
  type: 'entrada' | 'salida'
  quantity: number
} | null>(null)
const search = ref('')
const onlyLow = ref(false)
const editingId = ref<number | null>(null)
const editForm = reactive({
  name: '',
  unit: 'unidad',
  minQuantity: 5,
  publishWhenLow: false,
  publicNote: '',
  audience: '' as ClothingAudience | '',
  sizeLabel: '',
})
const savingEdit = ref(false)

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return products.value.filter((product) => {
    if (onlyLow.value && !isLow(product)) return false
    if (!term) return true
    return `${product.name} ${product.unit}`.toLowerCase().includes(term)
  })
})

async function load(opts?: { quiet?: boolean }) {
  try {
    const { data } = await api.get<Product[]>('/inventory/products')
    products.value = data
  } catch (err) {
    if (!opts?.quiet) error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

useLiveReload(() => load({ quiet: true }), {
  paused: () =>
    busyId.value !== null ||
    savingEdit.value ||
    showCreate.value ||
    editingId.value !== null ||
    Boolean(stockMove.value),
})

async function createProduct() {
  error.value = ''
  try {
    await api.post('/inventory/products', {
      ...productForm,
      audience: productForm.audience || null,
      sizeLabel: productForm.sizeLabel.trim() || null,
    })
    productForm.name = ''
    productForm.unit = 'unidad'
    productForm.quantity = 0
    productForm.minQuantity = 5
    productForm.publishWhenLow = false
    productForm.publicNote = ''
    productForm.audience = ''
    productForm.sizeLabel = ''
    showCreate.value = false
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

function cancelCreate() {
  showCreate.value = false
  error.value = ''
}

function openStock(product: Product, type: 'entrada' | 'salida') {
  if (busyId.value !== null) return
  error.value = ''
  stockMove.value = {
    productId: product.id,
    name: product.name,
    unit: product.unit,
    type,
    quantity: 1,
  }
}

function cancelStock() {
  if (busyId.value !== null) return
  stockMove.value = null
  error.value = ''
}

const stockProduct = computed(() => {
  if (!stockMove.value) return null
  return products.value.find((item) => item.id === stockMove.value?.productId) ?? null
})

async function confirmStock() {
  const move = stockMove.value
  if (!move || busyId.value !== null) return
  const quantity = Number(move.quantity)
  if (!Number.isFinite(quantity) || quantity < 1) {
    error.value = 'Escribe una cantidad mayor que cero.'
    return
  }
  error.value = ''
  busyId.value = move.productId
  try {
    await api.post('/inventory/movements', {
      productId: move.productId,
      type: move.type,
      quantity,
    })
    stockMove.value = null
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

function startEdit(product: Product) {
  showCreate.value = false
  editingId.value = product.id
  editForm.name = product.name
  editForm.unit = product.unit
  editForm.minQuantity = product.minQuantity
  editForm.publishWhenLow = product.publishWhenLow
  editForm.publicNote = product.publicNote ?? ''
  editForm.audience = product.audience ?? ''
  editForm.sizeLabel = product.sizeLabel ?? ''
  error.value = ''
}

function cancelEdit() {
  editingId.value = null
  error.value = ''
}

const editingProduct = computed(
  () => products.value.find((product) => product.id === editingId.value) ?? null,
)

async function saveEdit() {
  const product = editingProduct.value
  if (!product) return
  const name = editForm.name.trim()
  if (name.length < 2) {
    error.value = 'El nombre del producto debe tener al menos 2 caracteres.'
    return
  }
  error.value = ''
  savingEdit.value = true
  try {
    await api.patch(`/inventory/products/${product.id}`, {
      name,
      unit: editForm.unit.trim() || 'unidad',
      minQuantity: editForm.minQuantity,
      publishWhenLow: editForm.publishWhenLow,
      publicNote: editForm.publicNote.trim(),
      audience: editForm.audience || null,
      sizeLabel: editForm.sizeLabel.trim() || null,
    })
    editingId.value = null
    await load()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    savingEdit.value = false
  }
}

async function removeProduct(product: Product) {
  if (!window.confirm(`¿Eliminar “${product.name}” del inventario? Dejará de aparecer en existencias.`)) {
    return
  }
  error.value = ''
  try {
    await api.delete(`/inventory/products/${product.id}`)
    if (editingId.value === product.id) editingId.value = null
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
    <div class="page-head">
      <div>
        <h1>Inventario</h1>
        <p class="lead">
          Existencias y alertas cuando el stock baja del mínimo.
          <template v-if="auth.isAdmin"> El administrador puede cambiar el nombre o eliminar un producto.</template>
        </p>
      </div>
      <div class="page-actions">
        <button
          v-if="!showCreate && !editingId"
          class="btn btn-primary"
          type="button"
          @click="showCreate = true"
        >
          Nuevo producto
        </button>
      </div>
    </div>
    <p v-if="error && !showCreate && !editingId && !stockMove" class="flash flash-error">{{ error }}</p>

    <OverlayCard v-if="showCreate" @close="cancelCreate">
    <form class="form" @submit.prevent="createProduct">
      <h2>Nuevo producto</h2>
      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <label class="field"><span>Nombre</span><input v-model="productForm.name" required /></label>
      <label class="field"><span>Unidad</span><input v-model="productForm.unit" /></label>
      <div class="times">
        <label class="field">
          <span>Para quién (si es ropa)</span>
          <select v-model="productForm.audience">
            <option value="">No aplica</option>
            <option v-for="(label, id) in clothingAudienceLabel" :key="id" :value="id">{{ label }}</option>
          </select>
        </label>
        <label class="field">
          <span>Talla</span>
          <input v-model="productForm.sizeLabel" maxlength="40" placeholder="Ej. M, 32, 8" />
        </label>
      </div>
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
      <div class="form-actions">
        <button class="btn btn-ghost" type="button" @click="cancelCreate">Cancelar</button>
        <button class="btn btn-primary" type="submit">Crear</button>
      </div>
    </form>
    </OverlayCard>

    <OverlayCard v-if="editingProduct" @close="cancelEdit">
    <form class="form" @submit.prevent="saveEdit">
      <h2>Editar {{ editingProduct.name }}</h2>
      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <label class="field">
        <span>Nombre</span>
        <input v-model="editForm.name" required minlength="2" />
      </label>
      <label class="field">
        <span>Unidad</span>
        <input v-model="editForm.unit" required />
      </label>
      <div class="times">
        <label class="field">
          <span>Para quién (si es ropa)</span>
          <select v-model="editForm.audience">
            <option value="">No aplica</option>
            <option v-for="(label, id) in clothingAudienceLabel" :key="id" :value="id">{{ label }}</option>
          </select>
        </label>
        <label class="field">
          <span>Talla</span>
          <input v-model="editForm.sizeLabel" maxlength="40" placeholder="Ej. M, 32, 8" />
        </label>
      </div>
      <label class="field">
        <span>Mínimo para alerta</span>
        <input v-model.number="editForm.minQuantity" type="number" min="0" />
      </label>
      <label class="check">
        <input v-model="editForm.publishWhenLow" type="checkbox" />
        <span>Publicar en necesidades cuando baje del mínimo</span>
      </label>
      <label v-if="editForm.publishWhenLow" class="field">
        <span>Mensaje para donantes</span>
        <input v-model="editForm.publicNote" maxlength="300" />
      </label>
      <div class="form-actions">
        <button class="btn btn-ghost" type="button" @click="cancelEdit">Cancelar</button>
        <button class="btn btn-primary" type="submit" :disabled="savingEdit">
          {{ savingEdit ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </form>
    </OverlayCard>

    <OverlayCard v-if="stockMove" @close="cancelStock">
    <form class="form" @submit.prevent="confirmStock">
      <h2>
        {{ stockMove.type === 'entrada' ? 'Sumar al stock' : 'Restar del stock' }}
      </h2>
      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <p class="hint">
        {{ stockMove.name }}
        <template v-if="stockProduct">
          — hay {{ stockProduct.quantity }} {{ stockProduct.unit }} ahora.
        </template>
      </p>
      <label class="field">
        <span>Cantidad a {{ stockMove.type === 'entrada' ? 'sumar' : 'restar' }}</span>
        <input
          v-model.number="stockMove.quantity"
          type="number"
          min="1"
          step="1"
          required
          :disabled="busyId !== null"
        />
      </label>
      <div class="form-actions">
        <button class="btn btn-ghost" type="button" :disabled="busyId !== null" @click="cancelStock">
          Cancelar
        </button>
        <button class="btn btn-primary" type="submit" :disabled="busyId !== null">
          {{ busyId !== null ? 'Guardando...' : 'Confirmar' }}
        </button>
      </div>
    </form>
    </OverlayCard>

    <div class="block-head">
      <h2>Existencias</h2>
      <p class="hint">
        Pulsa <strong>+</strong> o <strong>−</strong>, escribe la cantidad y confirma. Mientras se
        guarda no se puede volver a pulsar. El historial está en Movimientos.
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
      Todavía no hay productos. Pulsa <strong>Nuevo producto</strong> para crear el primero.
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
        <p v-if="product.audience || product.sizeLabel" class="meta">
          <template v-if="product.audience">{{ clothingAudienceLabel[product.audience] }}</template>
          <template v-if="product.sizeLabel"> · talla {{ product.sizeLabel }}</template>
        </p>

        <div class="figure">
          <strong>{{ product.quantity }}</strong>
          <span>{{ product.unit }}</span>
        </div>

        <div class="counter">
          <button
            class="step"
            type="button"
            :disabled="busyId !== null || Boolean(stockMove)"
            aria-label="Restar del stock"
            @click="openStock(product, 'salida')"
          >
            −
          </button>
          <button
            class="step add"
            type="button"
            :disabled="busyId !== null || Boolean(stockMove)"
            aria-label="Sumar al stock"
            @click="openStock(product, 'entrada')"
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

        <div v-if="auth.isAdmin" class="catalog-actions">
          <button class="btn btn-ghost" type="button" @click="startEdit(product)">Editar</button>
          <button class="btn btn-ghost" type="button" @click="removeProduct(product)">Eliminar</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead { color: var(--ink-soft); }
.form { display: grid; gap: 0.8rem; }
.times { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.meta { color: var(--ink-soft); font-size: 0.88rem; margin: 0; }
@media (max-width: 520px) {
  .times { grid-template-columns: 1fr; }
}
.mini { width: 90px; border: 1px solid var(--line); border-radius: 8px; padding: 0.3rem 0.4rem; }
.hint { color: var(--ink-soft); font-size: 0.9rem; margin: -0.3rem 0 0.2rem; }
.block-head { margin-top: 1.1rem; }
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
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  gap: 0.4rem;
  max-width: 100%;
}

.step {
  width: 100%;
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

.catalog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
@media (max-width: 719px) {
  .mini { width: 100%; max-width: 140px; min-height: 44px; }
}
</style>
