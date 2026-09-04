import { createRouter, createWebHistory } from 'vue-router'
import { applySeoForPath } from '@/composables/useSeo'
import { HOME_DESCRIPTION, HOME_TITLE } from '@/seo'
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
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: {
            seo: {
              title: HOME_TITLE,
              description: HOME_DESCRIPTION,
              breadcrumbName: 'Inicio',
            },
          },
        },
        {
          path: 'nosotros',
          name: 'nosotros',
          component: () => import('@/views/NosotrosView.vue'),
          meta: {
            seo: {
              title: 'Quiénes somos | Entretejidos – Comité de Abrigo Pereira',
              description:
                'Conoce a Entretejidos, Comité de Abrigo en Pereira, Risaralda. Organizamos donaciones de ropa y entregas a familias que necesitan abrigo.',
              breadcrumbName: 'Quiénes somos',
            },
          },
        },
        {
          path: 'necesidades',
          name: 'necesidades',
          component: () => import('@/views/NecesidadesView.vue'),
          meta: {
            seo: {
              title: 'Qué se necesita para donar ropa en Pereira | Entretejidos',
              description:
                'Consulta qué ropa e insumos se necesitan ahora en Pereira. Entretejidos, Comité de Abrigo, orienta las donaciones hacia lo más urgente.',
              breadcrumbName: 'Necesidades',
            },
          },
        },
        {
          path: 'solicitar-ayuda',
          name: 'solicitar-ayuda',
          component: () => import('@/views/SolicitarAyudaView.vue'),
          meta: {
            seo: {
              title: 'Solicitar ropa y ayuda en Pereira | Entretejidos',
              description:
                'Solicita donaciones de ropa y otros insumos en Pereira. Completa el formulario de Entretejidos, Comité de Abrigo, y un voluntario tomará tu pedido.',
              breadcrumbName: 'Pedir ayuda',
            },
          },
        },
        {
          path: 'donar',
          name: 'donar',
          component: () => import('@/views/DonarView.vue'),
          meta: {
            seo: {
              title: 'Registrar una donación de ropa en Pereira | Entretejidos',
              description:
                'Registra una donación de ropa en Pereira. Deja tu contacto y lo que vas a entregar; Entretejidos, Comité de Abrigo, coordina la recepción.',
              breadcrumbName: 'Donar',
            },
          },
        },
        {
          path: 'ayudar',
          name: 'ayudar',
          component: () => import('@/views/AyudarView.vue'),
          meta: {
            seo: {
              title: 'Voluntariado en Pereira | Entretejidos',
              description:
                'Haz parte como voluntario en Pereira: ayuda en la sede o con transporte de ropa. Entretejidos, Comité de Abrigo, coordina horarios y entregas.',
              breadcrumbName: 'Hacer parte',
            },
          },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: {
        seo: {
          title: 'Acceso interno | Entretejidos',
          description: 'Entrada para voluntarios y el administrador de Entretejidos, Comité de Abrigo.',
          robots: 'noindex, nofollow',
        },
      },
    },
    {
      path: '/',
      component: () => import('@/layouts/PrivateLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '/panel', name: 'panel', component: () => import('@/views/PanelView.vue') },
        {
          path: '/inventario',
          name: 'inventario',
          meta: { module: 'inventory' },
          component: () => import('@/views/InventarioView.vue'),
        },
        {
          path: '/movimientos',
          name: 'movimientos',
          meta: { module: 'inventory' },
          component: () => import('@/views/MovimientosView.vue'),
        },
        {
          path: '/solicitudes',
          name: 'solicitudes',
          meta: { module: 'requests' },
          component: () => import('@/views/SolicitudesView.vue'),
        },
        {
          path: '/donaciones',
          name: 'donaciones',
          meta: { module: 'donations' },
          component: () => import('@/views/DonacionesView.vue'),
        },
        {
          path: '/necesidades-admin',
          name: 'necesidades-admin',
          meta: { module: 'needs' },
          component: () => import('@/views/NecesidadesAdminView.vue'),
        },
        {
          path: '/contenido',
          name: 'contenido',
          meta: { module: 'content' },
          component: () => import('@/views/ContenidoAdminView.vue'),
        },
        {
          path: '/voluntarios-tiempo',
          name: 'voluntarios-tiempo',
          meta: { module: 'time_volunteers' },
          component: () => import('@/views/VoluntariosTiempoView.vue'),
        },
        {
          path: '/bitacora',
          name: 'bitacora',
          meta: { module: 'shift_log' },
          component: () => import('@/views/BitacoraView.vue'),
        },
        {
          path: '/horario',
          name: 'horario',
          component: () => import('@/views/HorarioView.vue'),
        },
        {
          path: '/perfil',
          name: 'perfil',
          component: () => import('@/views/PerfilView.vue'),
        },
        {
          path: '/usuarios',
          name: 'usuarios',
          meta: { admin: true },
          component: () => import('@/views/UsuariosView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/layouts/PublicLayout.vue'),
      children: [
        {
          path: '',
          name: 'not-found-page',
          component: () => import('@/views/NotFoundView.vue'),
          meta: {
            seo: {
              title: 'Página no encontrada | Entretejidos',
              description: 'Esta dirección no existe en el sitio de Entretejidos, Comité de Abrigo.',
              robots: 'noindex, nofollow',
            },
          },
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
    if (to.meta.module && !auth.can(to.meta.module)) {
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

router.afterEach((to) => {
  applySeoForPath(to.meta, to.path)
})

export default router
