import { onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * Vuelve a pedir datos mientras la pestaña está visible, y al recuperarla.
 * Así otro usuario ve existencias o solicitudes nuevas sin recargar.
 * En Vercel no hay WebSockets estables; este intervalo cubre el caso.
 */
export function useLiveReload(
  reload: () => void | Promise<void>,
  options?: {
    intervalMs?: number
    paused?: MaybeRefOrGetter<boolean>
  },
) {
  const intervalMs = options?.intervalMs ?? 8000
  let timer: ReturnType<typeof setInterval> | null = null
  let inFlight = false

  async function tick() {
    if (inFlight) return
    if (options?.paused && toValue(options.paused)) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    inFlight = true
    try {
      await reload()
    } finally {
      inFlight = false
    }
  }

  function start() {
    stop()
    timer = setInterval(() => {
      void tick()
    }, intervalMs)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') {
      void tick()
      start()
    } else {
      stop()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', tick)
    start()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', tick)
    stop()
  })
}
