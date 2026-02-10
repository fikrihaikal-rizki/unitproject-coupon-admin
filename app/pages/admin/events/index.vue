<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold text-slate-900">Events Management</h1>
      <p class="text-slate-600">
        Kelola event yang tersedia untuk registrasi.
      </p>
    </div>

    <Card>
      <CardContent class="flex h-64 items-center justify-center">
        <div class="text-center">
          <Calendar class="mx-auto h-16 w-16 text-slate-400" />
          <h3 class="mt-4 text-lg font-medium text-slate-900">Coming Soon</h3>
          <p class="mt-2 text-sm text-slate-600">
            Events management akan tersedia segera.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script lang="ts">
import { Calendar } from 'lucide-vue-next'
</script>
