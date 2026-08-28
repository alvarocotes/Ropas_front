<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api/client'
import type { PublicNeed } from '@/types'

const needs = ref<PublicNeed[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get<PublicNeed[]>('/needs')
    needs.value = data
  } catch {
    needs.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="page">
    <h1>Qué se necesita ahora</h1>
    <p>
      Esta lista orienta a quienes quieren donar. Si puedes cubrir alguno de estos ítems,
      regístralo en el formulario de donación.
    </p>
    <p v-if="loading">Cargando...</p>
    <div v-else-if="needs.length === 0" class="card empty">No hay necesidades visibles en este momento.</div>
    <div v-else class="list">
      <article v-for="need in needs" :key="need.id" class="card">
        <div class="title">
          <h2>{{ need.title }}</h2>
          <span v-if="need.source === 'inventario'" class="tag">Stock bajo</span>
        </div>
        <p>{{ need.message || 'Recurso requerido para la operación de ABRIGAR.' }}</p>
        <div class="meta">
          <span>Cantidad orientativa: {{ need.quantityNeeded }}</span>
          <RouterLink class="btn btn-primary" to="/donar">Donar esto</RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

h1 {
  font-size: clamp(1.7rem, 8vw, 3rem);
  margin-bottom: 0.6rem;
}

.list {
  display: grid;
  gap: 1rem;
  margin-top: 1.4rem;
}

.card {
  padding: 1.2rem;
}

.title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.3rem;
}

.tag {
  background: rgba(193, 90, 55, 0.12);
  color: var(--terracotta);
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.empty {
  padding: 1.2rem;
  margin-top: 1rem;
}

@media (max-width: 719px) {
  .meta {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
