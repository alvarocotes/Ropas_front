<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { brandLogo } from '@/brand'
import { useAuthStore } from '@/stores/auth'
import { roleLabel } from '@/types'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  void router.push('/')
}
</script>

<template>
  <div class="shell">
    <aside>
      <div class="bar">
        <RouterLink to="/panel" class="brand">
          <img :src="brandLogo" alt="Logo de Entretejidos, Comité de Abrigo" class="mark" width="50" height="50" decoding="async" />
          <span class="brand-text">
            Entretejidos
            <small>Comité de Abrigo</small>
          </span>
        </RouterLink>
        <button class="logout-mobile btn btn-ghost" type="button" @click="logout">Salir</button>
      </div>
      <nav>
        <RouterLink to="/panel">Panel</RouterLink>
        <RouterLink to="/horario">Mi horario</RouterLink>
        <RouterLink v-if="auth.can('inventory')" to="/inventario">Inventario</RouterLink>
        <RouterLink v-if="auth.can('inventory')" to="/movimientos">Movimientos</RouterLink>
        <RouterLink v-if="auth.can('requests')" to="/solicitudes">Solicitudes</RouterLink>
        <RouterLink v-if="auth.can('donations')" to="/donaciones">Donaciones</RouterLink>
        <RouterLink v-if="auth.can('needs')" to="/necesidades-admin">Necesidades</RouterLink>
        <RouterLink v-if="auth.can('content')" to="/contenido">Contenido</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/usuarios">Usuarios</RouterLink>
        <RouterLink v-if="auth.can('time_volunteers')" to="/voluntarios-tiempo">
          Registro de voluntarios
        </RouterLink>
        <RouterLink v-if="auth.can('shift_log')" to="/bitacora">Bitácora</RouterLink>
        <RouterLink to="/perfil">Mi perfil</RouterLink>
      </nav>
      <div class="who">
        <RouterLink to="/perfil" class="who-link">
          <strong>{{ auth.user?.fullName }}</strong>
          <small>{{ auth.user ? roleLabel[auth.user.role] : '' }}</small>
        </RouterLink>
        <button class="btn btn-ghost" type="button" @click="logout">Cerrar sesión</button>
      </div>
    </aside>
    <div class="content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
}

aside {
  background: var(--navy);
  /* Trama de tela sobre el azul del logo. */
  background-image: repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.035) 0 1px,
      transparent 1px 4px
    ),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 4px);
  color: var(--cream);
  border-right: 3px solid var(--teal);
  min-width: 0;
  padding: 1.4rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--display);
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.brand-text small {
  font-family: var(--sans);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  font-weight: 600;
  opacity: 0.8;
  text-transform: uppercase;
}

.mark {
  width: 3.1rem;
  height: 3.1rem;
  object-fit: contain;
  background: transparent;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

nav a {
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  color: #e6ddd0;
  min-height: 44px;
  display: flex;
  align-items: center;
}

nav a.router-link-active {
  background: var(--teal);
  color: white;
  box-shadow: inset 0 0 0 1px rgba(224, 177, 76, 0.5);
}

.who {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.92rem;
}

.who-link {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  color: inherit;
}

.who-link:hover strong {
  text-decoration: underline;
}

.who small {
  opacity: 0.75;
}

.who .btn {
  margin-top: 0.6rem;
  color: white;
  border-color: rgba(255, 255, 255, 0.25);
}

.logout-mobile {
  display: none;
  color: white;
  border-color: rgba(255, 255, 255, 0.25);
  width: auto;
  min-height: 40px;
  padding: 0.4rem 0.85rem;
}

.content {
  padding: 1.4rem;
  min-width: 0;
}

@media (max-width: 860px) {
  .shell {
    /* minmax(0, …) evita que un hijo ancho estire la columna fuera de la pantalla. */
    grid-template-columns: minmax(0, 1fr);
    /* La barra superior mide lo que su contenido; el resto es para la vista. */
    grid-template-rows: auto minmax(0, 1fr);
  }

  aside {
    position: sticky;
    top: 0;
    z-index: 8;
    gap: 0.65rem;
    padding: 0.7rem 0.75rem 0.85rem;
    padding-top: max(0.7rem, env(safe-area-inset-top));
  }

  nav {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 0.4rem;
  }

  nav::-webkit-scrollbar {
    display: none;
  }

  nav a {
    flex: 0 0 auto;
    white-space: nowrap;
    padding: 0.45rem 0.85rem;
  }

  .who {
    display: none;
  }

  .logout-mobile {
    display: inline-flex;
  }

  .content {
    padding: 1rem 0.85rem max(1.2rem, env(safe-area-inset-bottom));
  }
}
</style>
