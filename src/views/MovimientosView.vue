<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api, { apiErrorMessage } from '@/api/client'
import OverlayCard from '@/components/OverlayCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useLiveReload } from '@/composables/useLiveReload'
import type { InventoryMovement, Product } from '@/types'
import { movementTypeLabel } from '@/types'

const products = ref<Product[]>([])
const movements = ref<InventoryMovement[]>([])
const error = ref('')
const showCreate = ref(false)
const form = reactive({
  productId: 0,
  type: 'entrada' as 'entrada' | 'salida',
  quantity: 1,
  note: '',
})

const hasProducts = computed(() => products.value.length > 0)

async function load(opts?: { quiet?: boolean }) {
  try {
    const [productRes, movementRes] = await Promise.all([
      api.get<Product[]>('/inventory/products'),
      api.get<InventoryMovement[]>('/inventory/movements'),
    ])
    products.value = productRes.data
    movements.value = movementRes.data
    if (!form.productId && products.value[0]) {
      form.productId = products.value[0].id
    }
  } catch (err) {
    if (!opts?.quiet) error.value = apiErrorMessage(err)
  }
}

onMounted(() => {
  void load()
})

useLiveReload(() => load({ quiet: true }))

function cancelCreate() {
  showCreate.value = false
  error.value = ''
}

async function registerMovement() {
  error.value = ''
  try {
    await api.post('/inventory/movements', form)
    form.quantity = 1
    form.note = ''
    showCreate.value = false
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
        <h1>Movimientos</h1>
        <p class="lead">Historial de entradas y salidas del inventario.</p>
      </div>
      <div class="page-actions">
        <button
          v-if="!showCreate"
          class="btn btn-primary"
          type="button"
          :disabled="!hasProducts"
          @click="showCreate = true"
        >
          Registrar movimiento
        </button>
      </div>
    </div>
    <p v-if="error && !showCreate" class="flash flash-error">{{ error }}</p>

    <OverlayCard v-if="showCreate" @close="cancelCreate">
    <form class="form" @submit.prevent="registerMovement">
      <h2>Registrar movimiento</h2>
      <p v-if="error" class="flash flash-error">{{ error }}</p>
      <p class="hint">Usa una nota cuando la entrada o salida necesite un detalle escrito.</p>
      <label class="field">
        <span>Producto</span>
        <select v-model.number="form.productId" required>
          <option v-for="product in products" :key="product.id" :value="product.id">
            {{ product.name }}
          </option>
        </select>
      </label>
      <label class="field">
        <span>Tipo</span>
        <select v-model="form.type">
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </label>
      <label class="field">
        <span>Cantidad</span>
        <input v-model.number="form.quantity" type="number" min="1" required />
      </label>
      <label class="field">
        <span>Nota</span>
        <input v-model="form.note" />
      </label>
      <div class="form-actions">
        <button class="btn btn-ghost" type="button" @click="cancelCreate">Cancelar</button>
        <button class="btn btn-primary" type="submit">Guardar</button>
      </div>
    </form>
    </OverlayCard>

    <div v-if="movements.length === 0" class="card empty">
      <template v-if="!hasProducts">
        Todavía no hay productos. Crea uno en Inventario para poder registrar movimientos.
      </template>
      <template v-else>
        Todavía no hay movimientos. Pulsa <strong>Registrar movimiento</strong> o ajusta el stock
        desde Inventario.
      </template>
    </div>
    <div v-else class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Nota</th>
            <th>Por</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="movement in movements" :key="movement.id">
            <td data-label="Fecha">{{ new Date(movement.createdAt).toLocaleString('es') }}</td>
            <td data-label="Producto">{{ movement.product?.name }}</td>
            <td data-label="Tipo">
              <StatusBadge
                :tone="movement.type === 'entrada' ? 'listo' : 'alerta'"
                :label="movementTypeLabel[movement.type]"
              />
            </td>
            <td data-label="Cantidad">{{ movement.quantity }}</td>
            <td data-label="Nota">{{ movement.note || '—' }}</td>
            <td data-label="Por">{{ movement.user?.fullName }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead { color: var(--ink-soft); }
.form { display: grid; gap: 0.8rem; }
.table-wrap { margin-top: 1rem; padding: 1.1rem; display: grid; gap: 0.8rem; }
.hint { color: var(--ink-soft); font-size: 0.9rem; margin: -0.3rem 0 0.2rem; }
.empty { padding: 1.1rem; color: var(--ink-soft); margin-top: 1rem; }
</style>
