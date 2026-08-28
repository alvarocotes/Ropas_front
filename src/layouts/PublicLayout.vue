<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const menuOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <div class="public">
    <header class="top">
      <RouterLink to="/" class="brand">
        <img src="/logo.jpeg" alt="Logo de ABRIGAR" class="mark" />
        <span class="brand-text">
          ABRIGAR
          <small>Comité de donación de ropa</small>
        </span>
      </RouterLink>
      <button
        class="menu-btn"
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="public-nav"
        :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="menuOpen = !menuOpen"
      >
        <span :class="{ open: menuOpen }"></span>
      </button>
      <div class="weave-strip top-strip" aria-hidden="true"></div>
      <nav id="public-nav" :class="{ open: menuOpen }">
        <RouterLink to="/nosotros">Quiénes somos</RouterLink>
        <RouterLink to="/necesidades">Necesidades</RouterLink>
        <RouterLink to="/solicitar-ayuda">Pedir ayuda</RouterLink>
        <RouterLink to="/donar" class="btn btn-primary donate">Donar</RouterLink>
        <RouterLink to="/login" class="login">Entrar</RouterLink>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
    <footer>
      <div class="weave-strip footer-strip" aria-hidden="true"></div>
      <p class="script">Dona con amor, abriga con esperanza.</p>
      <p>ABRIGAR · Comité de donación de ropa · gestión de voluntarios, donaciones e inventario.</p>
    </footer>
  </div>
</template>

<style scoped>
.public {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  padding-top: max(0.85rem, env(safe-area-inset-top));
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(242, 233, 216, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px dashed var(--line);
}

.top-strip {
  /* Se dibuja siempre al final de la cabecera, de borde a borde. */
  order: 3;
  width: 100%;
  margin: 0 -1rem -0.85rem;
  border-radius: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--display);
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.brand-text {
  display: grid;
  line-height: 1.05;
}

.brand-text small {
  font-family: var(--sans);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  color: var(--teal);
}

.mark {
  width: 2.6rem;
  height: 2.6rem;
  /* Recorte circular del emblema, sin borde que duplique su aro. */
  object-fit: cover;
  border-radius: 50%;
}

.menu-btn {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
}

.menu-btn span,
.menu-btn span::before,
.menu-btn span::after {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--ink);
  border-radius: 2px;
  position: relative;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.menu-btn span::before,
.menu-btn span::after {
  content: '';
  position: absolute;
}

.menu-btn span::before {
  top: -6px;
}

.menu-btn span::after {
  top: 6px;
}

.menu-btn span.open {
  background: transparent;
}

.menu-btn span.open::before {
  top: 0;
  transform: rotate(45deg);
}

.menu-btn span.open::after {
  top: 0;
  transform: rotate(-45deg);
}

nav {
  display: none;
  flex-direction: column;
  gap: 0.45rem;
  width: 100%;
  font-weight: 600;
  font-size: 1rem;
  padding-bottom: 0.4rem;
}

nav.open {
  display: flex;
}

nav a {
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 0.4rem 0.15rem;
}

.donate {
  justify-content: center;
}

.login {
  color: var(--ink-soft);
}

main {
  flex: 1;
}

footer {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 1.8rem 1rem max(1.5rem, env(safe-area-inset-bottom));
  color: var(--ink-soft);
  font-size: 0.9rem;
  text-align: center;
}

.footer-strip {
  width: min(420px, 80%);
}

@media (min-width: 760px) {
  .menu-btn {
    display: none;
  }

  nav,
  nav.open {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: auto;
    gap: 0.9rem;
    padding-bottom: 0;
  }

  nav a {
    min-height: auto;
    padding: 0;
  }
}
</style>
