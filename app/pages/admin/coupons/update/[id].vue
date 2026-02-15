<script setup lang="ts">
import { Loader2 } from "lucide-vue-next";
import EventCouponForm from "~/components/forms/EventCouponForm.vue";

definePageMeta({
  layout: "admin",
});

const route = useRoute();
const couponId = route.params.id as string;

// Fetch coupon data
const { data, pending, error } = await useFetch(`/api/admin/coupons/${couponId}`);

const coupon = computed(() => (data.value as any)?.data);
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h1 class="text-3xl font-bold text-slate-900">Update Coupon</h1>
        <p class="text-slate-600">
          Edit coupon details for {{ coupon?.name || 'Loading...' }}.
        </p>
      </div>
    </div>

    <div v-if="pending" class="flex items-center justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>

    <div
      v-else-if="error"
      class="rounded-lg border border-destructive bg-destructive/10 p-8 text-center"
    >
      <h3 class="text-lg font-medium text-destructive">
        Failed to load coupon
      </h3>
      <p class="mt-2 text-sm text-slate-600">
        {{ error.message || "An error occurred while fetching the coupon." }}
      </p>
    </div>

    <EventCouponForm
      v-else-if="coupon"
      :initial-data="coupon"
      :coupon-id="couponId"
    />
  </div>
</template>
