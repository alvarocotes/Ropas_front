<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api/client'
import type { PublicNeed } from '@/types'

const count = ref<number | null>(null)
const needs = ref<PublicNeed[]>([])

onMounted(async () => {
  try {
    const [stats, needList] = await Promise.all([
      api.get<{ count: number }>('/stats/volunteers-count'),
      api.get<PublicNeed[]>('/needs'),
    ])
    count.value = stats.data.count
    needs.value = needList.data.slice(0, 6)
  } catch {
    count.value = 0
    needs.value = []
  }
})
</script>

<template>
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">Comité de donación de ropa</p>
      <h1>Organizar la ayuda, de la donación a la entrega.</h1>
      <p class="script">Dona con amor, abriga con esperanza.</p>
      <p class="lead">
        ABRIGAR centraliza voluntarios, inventario y solicitudes para que cada prenda llegue a
        quien la necesita.
      </p>
      <div class="actions">
        <RouterLink to="/donar" class="btn btn-primary">Registrar una donación</RouterLink>
        <RouterLink to="/ayudar" class="btn btn-ghost">Ayudar con tiempo</RouterLink>
        <RouterLink to="/solicitar-ayuda" class="btn btn-ghost">Solicitar ayuda</RouterLink>
        <RouterLink to="/nosotros" class="btn btn-ghost">Quiénes somos</RouterLink>
      </div>
      <div class="stat card">
        <strong>{{ count ?? '—' }}</strong>
        <span>voluntarios activos</span>
      </div>
    </div>
    <img src="/logo.jpeg" alt="Logo de ABRIGAR" class="hero-logo" />
  </section>

  <section class="needs">
    <div class="section-head">
      <h2 class="hanger-head">Necesidades actuales</h2>
      <RouterLink to="/necesidades">Ver todas</RouterLink>
    </div>
    <div v-if="needs.length === 0" class="empty">Aún no hay necesidades publicadas.</div>
    <div class="cards">
      <article v-for="need in needs" :key="need.id" class="card need">
        <h3>
          {{ need.title }}
          <span v-if="need.source === 'inventario'" class="tag">Stock bajo</span>
        </h3>
        <p>{{ need.message || 'Se requiere este recurso.' }}</p>
        <small>Cantidad orientativa: {{ need.quantityNeeded }}</small>
      </article>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 1.6rem 1rem 1rem;
  max-width: 1040px;
  margin: 0 auto;
  display: grid;
  gap: 1.4rem;
  align-items: center;
}

.hero-logo {
  /* En móvil encabeza el bloque y ocupa poco alto. */
  order: -1;
  width: min(220px, 60vw);
  aspect-ratio: 1;
  /* Recorte circular del propio emblema: sin borde añadido ni marco rectangular. */
  object-fit: cover;
  border-radius: 50%;
  justify-self: center;
}

@media (min-width: 860px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .hero-logo {
    order: 0;
    width: 320px;
  }
}

.script {
  margin-bottom: 0.8rem;
}

.eyebrow {
  color: var(--terracotta);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
}

h1 {
  font-size: clamp(1.85rem, 9vw, 4.2rem);
  max-width: 14ch;
  margin: 0.6rem 0 1rem;
}

.lead {
  max-width: 42ch;
  color: var(--ink-soft);
  font-size: 1.05rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 1.4rem 0 1.8rem;
}

.stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.7rem;
  padding: 0.9rem 1.2rem;
}

.stat strong {
  font-family: var(--display);
  font-size: 2rem;
  color: var(--teal);
}

.needs {
  padding: 1rem 1rem 3rem;
  max-width: 1100px;
  margin: 0 auto;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.section-head a {
  font-weight: 600;
  color: var(--terracotta);
  white-space: nowrap;
}

.cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

.need {
  padding: 1.1rem;
}

.need h3 {
  font-family: var(--display);
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: rgba(193, 90, 55, 0.12);
  color: var(--terracotta);
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.empty {
  color: var(--ink-soft);
}

@media (max-width: 719px) {
  .actions .btn {
    width: 100%;
  }
}

@media (min-width: 640px) {
  .cards {
    grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  }
}
</style>
