<script setup lang="ts">
import { ref } from 'vue'
import VolunteerScheduleEditor from '@/components/VolunteerScheduleEditor.vue'

const error = ref('')
const flash = ref('')
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h1>Mi horario</h1>
        <p class="lead">
          Indica de qué hora a qué hora irás cada día. El equipo lo verá en el panel y en usuarios.
        </p>
      </div>
    </div>
    <p v-if="error" class="flash flash-error">{{ error }}</p>
    <p v-if="flash" class="flash flash-ok">{{ flash }}</p>
    <VolunteerScheduleEditor
      @error="(message) => { error = message; flash = '' }"
      @saved="(message) => { flash = message; error = '' }"
    />
  </section>
</template>

<style scoped>
h1 { font-size: clamp(1.6rem, 7vw, 2.2rem); }
.lead { color: var(--ink-soft); }
</style>
