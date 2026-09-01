/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend, sin /api. Vacío = ruta relativa (proxy de Vite o mismo dominio). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    admin?: boolean
    roles?: ('admin' | 'volunteer' | 'reception')[]
    module?:
      | 'inventory'
      | 'donations'
      | 'requests'
      | 'needs'
      | 'content'
      | 'time_volunteers'
  }
}
