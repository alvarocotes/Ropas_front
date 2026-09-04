<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="page">
    <h1>Página no encontrada</h1>
    <p>
      Esta dirección no existe. Puedes donar ropa en Pereira, pedir ayuda o volver al inicio.
    </p>
    <div class="actions">
      <RouterLink class="btn btn-primary" to="/">Ir al inicio</RouterLink>
      <RouterLink class="btn btn-ghost" to="/donar">Donar ropa</RouterLink>
      <RouterLink class="btn btn-ghost" to="/solicitar-ayuda">Pedir ayuda</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
}

h1 {
  font-size: clamp(1.7rem, 8vw, 2.6rem);
  margin-bottom: 0.6rem;
}

p {
  color: var(--ink-soft);
  max-width: 46ch;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1.2rem;
}
</style>
