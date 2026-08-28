<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ImpactPoint } from '@/types'

const props = defineProps<{ points: ImpactPoint[] }>()

const container = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let layer: L.LayerGroup | null = null

/** Cada entrega ubicada es un punto propio en el mapa. */
const markers = computed(() =>
  props.points.map((point) => ({
    key: `p-${point.id}`,
    name: point.label,
    latitude: point.latitude,
    longitude: point.longitude,
    peopleHelped: point.peopleHelped,
  })),
)

function radiusFor(people: number): number {
  return Math.min(30, 7 + Math.sqrt(Math.max(people, 0)) * 1.6)
}

function draw() {
  if (!map) return
  layer?.remove()
  layer = L.layerGroup().addTo(map)
  if (!markers.value.length) return

  for (const marker of markers.value) {
    const detail = `${marker.peopleHelped} persona(s) ayudada(s)`
    L.circleMarker([marker.latitude, marker.longitude], {
      radius: radiusFor(marker.peopleHelped),
      color: '#c45a3c',
      weight: 2,
      fillColor: '#c45a3c',
      fillOpacity: 0.38,
    })
      .bindPopup(`<strong>${marker.name}</strong><br>${detail}`)
      .bindTooltip(marker.name, { direction: 'top' })
      .addTo(layer)
  }

  map.fitBounds(
    L.latLngBounds(markers.value.map((marker) => [marker.latitude, marker.longitude])),
    { padding: [40, 40], maxZoom: 14 },
  )
}

onMounted(() => {
  if (!container.value) return
  map = L.map(container.value, { scrollWheelZoom: false })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(map)
  map.setView([4.8133, -75.6961], 11)
  draw()
})

watch(markers, draw)

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="map-wrap">
    <div ref="container" class="map" />
    <p v-if="!markers.length" class="hint">
      Todavía no hay entregas ubicadas en el mapa.
    </p>
  </div>
</template>

<style scoped>
.map-wrap {
  display: grid;
  gap: 0.6rem;
}

.map {
  height: 380px;
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  z-index: 0;
}

.hint {
  color: var(--ink-soft);
  font-size: 0.9rem;
}

@media (max-width: 719px) {
  .map {
    height: 280px;
  }
}
</style>
