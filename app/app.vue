<script setup lang="ts">
import "vue-sonner/style.css";
</script>

<template>
  <NuxtLayout>
    <Toaster position="top-center" :expand="true" richColors />
    <NuxtPage />
  </NuxtLayout>
</template>
