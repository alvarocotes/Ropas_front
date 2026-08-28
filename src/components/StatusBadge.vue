<script setup lang="ts">
defineProps<{
  label: string
  tone?: 'recibido' | 'en_proceso' | 'listo' | 'entregado' | 'cancelado' | 'ingresado' | 'alerta'
}>()
</script>

<template>
  <span class="badge" :class="tone || 'recibido'">{{ label }}</span>
</template>

<style scoped>
.recibido {
  background: var(--info-bg);
  color: var(--info);
}
.en_proceso {
  background: var(--warn-bg);
  color: var(--warn);
}
.listo,
.ingresado,
.entregado {
  background: var(--ok-bg);
  color: var(--ok);
}
.cancelado,
.alerta {
  background: var(--alert-bg);
  color: var(--alert);
}
</style>
