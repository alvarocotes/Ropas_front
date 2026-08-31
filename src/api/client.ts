import axios from 'axios'

/**
 * URL base del backend. Se define en VITE_API_URL (sin la parte /api), por ejemplo
 * https://api.abrigar.org. Si no se define, se usa la ruta relativa /api, que en
 * desarrollo resuelve el proxy de Vite y en producción sirve si el front y el back
 * están detrás del mismo dominio.
 */
const apiBaseUrl = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api`

const api = axios.create({
  baseURL: apiBaseUrl,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('abrigar_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const publicPaths = ['/', '/login', '/necesidades', '/solicitar-ayuda', '/donar', '/ayudar', '/nosotros']
      const onPublic = publicPaths.includes(window.location.pathname)
      const onLogin = window.location.pathname === '/login'
      if (!onPublic && !onLogin && !error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('abrigar_token')
        localStorage.removeItem('abrigar_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un error') {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'No hay conexión con el servidor. Espera un momento e inténtalo de nuevo.'
    }
    if (error.response.status >= 500) {
      return 'El servidor no está disponible. Revisa que el backend esté encendido.'
    }
    const message = error.response.data?.message
    if (Array.isArray(message)) return message.join('. ')
    if (typeof message === 'string') return message
  }
  return fallback
}

export default api
