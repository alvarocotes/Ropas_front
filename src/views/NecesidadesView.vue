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
      Esta lista orienta a quienes quieren donar ropa en Pereira. Si puedes cubrir alguno de estos
      ítems, regístralo en el formulario de donación.
    </p>
    <p v-if="loading">Cargando...</p>
    <div v-else-if="needs.length === 0" class="card empty">No hay necesidades visibles en este momento.</div>
    <div v-else class="list">
      <article v-for="need in needs" :key="need.id" class="card need">
        <div class="title">
          <h2>{{ need.title }}</h2>
          <span v-if="need.source === 'inventario'" class="tag">Stock bajo</span>
        </div>
        <p class="desc">{{ need.message || 'Recurso requerido para la operación de Entretejidos.' }}</p>
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
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

h1 {
  font-size: clamp(1.7rem, 8vw, 3rem);
  margin-bottom: 0.6rem;
}

.page > p {
  max-width: 52ch;
}

.list {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.4rem;
  grid-template-columns: repeat(auto-fill, minmax(min(210px, 100%), 1fr));
}

.need {
  padding: 1rem 0.95rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 220px;
}

.title {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem 0.55rem;
  flex-wrap: wrap;
}

.need h2 {
  font-size: 1.05rem;
  line-height: 1.2;
  margin: 0;
  overflow-wrap: anywhere;
}

.desc {
  color: var(--ink-soft);
  font-size: 0.88rem;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.tag {
  background: rgba(193, 90, 55, 0.12);
  color: var(--terracotta);
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.meta {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.65rem;
  margin-top: auto;
}

.meta span {
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.meta .btn {
  width: 100%;
  min-height: 40px;
  padding: 0.5rem 0.8rem;
  font-size: 0.88rem;
}

.empty {
  padding: 1.2rem;
  margin-top: 1rem;
}
</style>
