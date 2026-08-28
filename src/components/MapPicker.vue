<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface ReferencePoint {
  latitude: number
  longitude: number
  label: string
}

const props = withDefaults(
  defineProps<{
    latitude: number | null
    longitude: number | null
    references?: ReferencePoint[]
    height?: string
  }>(),
  { references: () => [], height: '320px' },
)

const emit = defineEmits<{ pick: [latitude: number, longitude: number] }>()

const container = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null
let referenceLayer: L.LayerGroup | null = null

const PIN = L.divIcon({
  className: 'pin-icon',
  html: '<span class="pin"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function pick(latlng: L.LatLng) {
  emit('pick', Number(latlng.lat.toFixed(7)), Number(latlng.lng.toFixed(7)))
}

function syncMarker() {
  if (!map) return
  const hasPoint = props.latitude !== null && props.longitude !== null
  if (!hasPoint) {
    marker?.remove()
    marker = null
    return
  }
  const position = L.latLng(props.latitude as number, props.longitude as number)
  if (!marker) {
    marker = L.marker(position, { icon: PIN, draggable: true }).addTo(map)
    marker.on('dragend', () => {
      if (marker) pick(marker.getLatLng())
    })
  } else {
    marker.setLatLng(position)
  }
  map.panTo(position)
}

function drawReferences() {
  if (!map) return
  referenceLayer?.remove()
  referenceLayer = L.layerGroup().addTo(map)
  for (const point of props.references) {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue
    L.circleMarker([point.latitude, point.longitude], {
      radius: 6,
      color: '#1f2a44',
      weight: 1,
      fillColor: '#5b6478',
      fillOpacity: 0.5,
      interactive: true,
    })
      .bindTooltip(point.label, { direction: 'top' })
      .addTo(referenceLayer)
  }
}

onMounted(() => {
  if (!container.value) return
  map = L.map(container.value)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map)

  const start =
    props.latitude !== null && props.longitude !== null
      ? L.latLng(props.latitude, props.longitude)
      : L.latLng(4.8133, -75.6961)
  map.setView(start, props.latitude !== null ? 15 : 12)

  map.on('click', (event: L.LeafletMouseEvent) => pick(event.latlng))
  drawReferences()
  syncMarker()
})

watch(() => [props.latitude, props.longitude], syncMarker)
watch(() => props.references, drawReferences, { deep: true })

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="picker">
    <div ref="container" class="map" :style="{ height }" />
    <p class="hint">
      Haz clic en el mapa para poner el punto, o arrastra el marcador para ajustarlo. También
      puedes escribir las coordenadas a mano.
    </p>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  gap: 0.4rem;
}

.map {
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  cursor: crosshair;
  z-index: 0;
}

.hint {
  color: var(--ink-soft);
  font-size: 0.85rem;
}
</style>

<style>
/* El marcador se dibuja con CSS para no depender de las imágenes de Leaflet. */
.pin-icon .pin {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(196, 90, 60, 0.9);
  border: 3px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  cursor: grab;
}
</style>
