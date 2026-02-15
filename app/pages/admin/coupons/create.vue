<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin'
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <Button variant="outline" size="icon" as-child>
        <NuxtLink to="/admin/coupons">
          <ArrowLeft class="h-4 w-4" />
        </NuxtLink>
      </Button>
      <h1 class="text-3xl font-bold text-slate-900">Create New Coupon</h1>
    </div>

    <Card>
      <CardContent class="flex h-64 flex-col items-center justify-center p-8">
        <p class="text-lg font-medium text-slate-900 text-center">
          Create New Coupon Form coming soon
        </p>
        <p class="mt-2 text-sm text-slate-600">
          This is a placeholder page for testing navigation.
        </p>
        <Button class="mt-6" as-child>
          <NuxtLink to="/admin/coupons">
            Back to Coupon List
          </NuxtLink>
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
