import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/PublicLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
        {
          path: 'nosotros',
          name: 'nosotros',
          component: () => import('@/views/NosotrosView.vue'),
        },
        {
          path: 'necesidades',
          name: 'necesidades',
          component: () => import('@/views/NecesidadesView.vue'),
        },
        {
          path: 'solicitar-ayuda',
          name: 'solicitar-ayuda',
          component: () => import('@/views/SolicitarAyudaView.vue'),
        },
        { path: 'donar', name: 'donar', component: () => import('@/views/DonarView.vue') },
      ],
    },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/',
      component: () => import('@/layouts/PrivateLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '/panel', name: 'panel', component: () => import('@/views/PanelView.vue') },
        {
          path: '/inventario',
          name: 'inventario',
          meta: { roles: ['admin', 'volunteer'] },
          component: () => import('@/views/InventarioView.vue'),
        },
        {
          path: '/solicitudes',
          name: 'solicitudes',
          component: () => import('@/views/SolicitudesView.vue'),
        },
        {
          path: '/donaciones',
          name: 'donaciones',
          meta: { roles: ['admin', 'volunteer'] },
          component: () => import('@/views/DonacionesView.vue'),
        },
        {
          path: '/necesidades-admin',
          name: 'necesidades-admin',
          meta: { roles: ['admin', 'volunteer'] },
          component: () => import('@/views/NecesidadesAdminView.vue'),
        },
        {
          path: '/contenido',
          name: 'contenido',
          meta: { admin: true },
          component: () => import('@/views/ContenidoAdminView.vue'),
        },
        {
          path: '/usuarios',
          name: 'usuarios',
          meta: { admin: true },
          component: () => import('@/views/UsuariosView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth) {
    if (!auth.token) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (!auth.user) {
      try {
        await auth.fetchMe()
      } catch {
        auth.logout()
        return { name: 'login' }
      }
    }
    if (to.meta.admin && !auth.isAdmin) {
      return { name: 'panel' }
    }
    if (to.meta.roles && auth.user && !to.meta.roles.includes(auth.user.role)) {
      return { name: 'panel' }
    }
  }
  if (to.name === 'login' && auth.token) {
    return { name: 'panel' }
  }
  return true
})

export default router
