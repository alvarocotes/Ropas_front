<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api/client'
import ImpactMap from '@/components/ImpactMap.vue'
import type { AboutSection, Impact } from '@/types'

const sections = ref<AboutSection[]>([])
const impact = ref<Impact | null>(null)
const loading = ref(true)

/** Resumen por sector: agrupa las entregas que comparten la misma etiqueta. */
const sectors = computed(() => {
  const totals = new Map<string, { name: string; peopleHelped: number; deliveries: number }>()
  for (const point of impact.value?.points ?? []) {
    const current = totals.get(point.label) ?? {
      name: point.label,
      peopleHelped: 0,
      deliveries: 0,
    }
    current.peopleHelped += point.peopleHelped
    current.deliveries += 1
    totals.set(point.label, current)
  }
  return [...totals.values()].sort((a, b) => b.peopleHelped - a.peopleHelped)
})

onMounted(async () => {
  try {
    const [sectionRes, impactRes] = await Promise.all([
      api.get<AboutSection[]>('/about/sections'),
      api.get<Impact>('/about/impact'),
    ])
    sections.value = sectionRes.data
    impact.value = impactRes.data
  } catch {
    sections.value = []
    impact.value = null
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <header class="intro">
      <h1>Quiénes somos</h1>
      <p class="script">Dona con amor, abriga con esperanza.</p>
      <p>
        ABRIGAR es un esfuerzo colectivo para que ninguna familia afectada por el sismo pase la
        noche sin abrigo.
      </p>
    </header>

    <section v-if="impact" class="figures">
      <article class="card figure">
        <strong>{{ impact.peopleHelped }}</strong>
        <span>personas ayudadas</span>
      </article>
      <article class="card figure">
        <strong>{{ impact.familiesHelped }}</strong>
        <span>entregas completadas</span>
      </article>
      <article class="card figure">
        <strong>{{ impact.itemsDelivered }}</strong>
        <span>artículos entregados</span>
      </article>
      <article class="card figure">
        <strong>{{ impact.zonesCovered }}</strong>
        <span>zonas atendidas</span>
      </article>
    </section>

    <p v-if="loading" class="muted">Cargando...</p>

    <section v-for="section in sections" :key="section.id" class="card block">
      <h2 class="hanger-head">{{ section.title }}</h2>
      <p v-for="(paragraph, index) in section.body.split('\n').filter(Boolean)" :key="index">
        {{ paragraph }}
      </p>
    </section>

    <section class="card block">
      <h2 class="hanger-head">Dónde hemos ayudado</h2>
      <p class="muted">
        Cada círculo es una entrega ubicada en su sector, y su tamaño crece con el número de
        personas atendidas. Por respeto a la privacidad de las familias mostramos solo el sector
        aproximado, nunca la dirección.
      </p>
      <ImpactMap :points="impact?.points ?? []" />
      <ul v-if="sectors.length" class="zone-list">
        <li v-for="sector in sectors" :key="sector.name">
          <span>{{ sector.name }}</span>
          <strong>{{ sector.peopleHelped }} persona(s)</strong>
        </li>
      </ul>
      <p v-else class="muted">
        Todavía no hay entregas registradas. En cuanto se completen, aparecerán aquí.
      </p>
    </section>

    <section class="cta card">
      <h2>¿Quieres sumarte?</h2>
      <p>Puedes aportar donaciones o consultar qué se necesita ahora mismo.</p>
      <div class="cta-actions">
        <RouterLink class="btn btn-primary" to="/donar">Registrar una donación</RouterLink>
        <RouterLink class="btn btn-ghost" to="/necesidades">Ver necesidades</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  display: grid;
  gap: 1.1rem;
}

.intro h1 {
  font-size: clamp(1.8rem, 8vw, 3rem);
  margin-bottom: 0.4rem;
}

.intro p,
.muted {
  color: var(--ink-soft);
}

.figures {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));
}

.figure {
  padding: 1rem;
  display: grid;
  gap: 0.2rem;
  text-align: center;
}

.figure strong {
  font-family: var(--display);
  font-size: 2rem;
  line-height: 1;
  color: var(--terracotta);
}

.figure span {
  color: var(--ink-soft);
  font-size: 0.88rem;
}

.block {
  padding: 1.2rem;
  display: grid;
  gap: 0.6rem;
}

.block h2 {
  font-family: var(--display);
  font-size: clamp(1.2rem, 5vw, 1.6rem);
}

.zone-list {
  list-style: none;
  display: grid;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
}

.zone-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.5rem 0.7rem;
  background: var(--paper);
  border-radius: 10px;
}

.cta {
  padding: 1.2rem;
  display: grid;
  gap: 0.6rem;
}

.cta-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

@media (max-width: 719px) {
  .cta-actions .btn {
    width: 100%;
  }
}
</style>
