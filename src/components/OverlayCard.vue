<script lang="ts">
let scrollLocks = 0
</script>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{
  wide?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

function lockScroll() {
  scrollLocks += 1
  if (scrollLocks === 1) document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) document.body.style.overflow = ''
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  lockScroll()
  document.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  unlockScroll()
})
</script>

<template>
  <Teleport to="body">
    <div class="overlay" role="dialog" aria-modal="true" @click.self="emit('close')">
      <div class="card sheet" :class="{ wide }" tabindex="-1">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(31, 42, 68, 0.48);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: max(1rem, env(safe-area-inset-top)) 0.75rem max(1.2rem, env(safe-area-inset-bottom));
}

.sheet {
  width: min(34rem, 100%);
  margin: min(4vh, 1.6rem) 0 auto;
  padding: 1.15rem 1.1rem 1.2rem;
  display: grid;
  gap: 0.8rem;
  outline: none;
}

.sheet.wide {
  width: min(48rem, 100%);
}
</style>
