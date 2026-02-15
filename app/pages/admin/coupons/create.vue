<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import EventCouponForm from '~/components/forms/EventCouponForm.vue';

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
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Create New Coupon</h1>
        <p class="text-sm text-slate-500">Isi detail kupon untuk event yang dipilih.</p>
      </div>
    </div>

    <EventCouponForm />
  </div>
</template>
