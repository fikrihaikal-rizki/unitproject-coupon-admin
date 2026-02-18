<script setup lang="ts">
import { computed } from "vue";

interface Props {
  max: number | null | undefined;
  current: number;
  final: number;
  label?: string;
  unit?: string;
  showLegend?: boolean;
  showLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  max: null,
  current: 0,
  final: 0,
  label: "",
  unit: "pcs",
  showLegend: true,
  showLabel: true,
});

const baseValue = computed(() => {
  if (props.max && props.max > 0) return props.max;
  return props.current > 0 ? props.current : 1; // Safely avoid division by zero
});

const currentWidth = computed(() => {
  return Math.min((props.current / baseValue.value) * 100, 100);
});

const finalWidth = computed(() => {
  return Math.min((props.final / baseValue.value) * 100, 100);
});

const fulfillmentRate = computed(() => {
  if (props.current === 0) return 0;
  return Math.round((props.final / props.current) * 100);
});

const formattedMax = computed(() => {
  return props.max && props.max > 0 ? props.max : "∞";
});
</script>

<template>
  <div class="w-full space-y-2">
    <!-- Header with Label and fulfillment percentage -->
    <div v-if="label || current > 0" class="flex items-center justify-between text-xs">
      <span v-if="label" class="font-medium text-slate-700">{{ label }}</span>
      <span v-if="current > 0 && showLabel" class="font-bold text-slate-500">
        {{ fulfillmentRate }}% <span class="text-[10px] font-normal text-slate-400 capitalize">{{ unit }} Redeemed</span>
      </span>
    </div>

    <!-- Multi-layered Bar Container -->
    <div class="relative h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <!-- Intermediate Layer (Current/Generated) -->
      <div
        class="absolute left-0 top-0 h-full bg-yellow-400 transition-all duration-500 ease-out"
        :style="{ width: `${currentWidth}%` }"
      />
      <!-- Final Layer (Final/Redeemed) - sits on top -->
      <div
        class="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500 ease-out z-10"
        :style="{ width: `${finalWidth}%` }"
      />
    </div>

    <!-- Detailed Legend -->
    <div v-if="showLegend" class="grid grid-cols-3 gap-1 pt-0.5">
      <!-- Max -->
      <div class="flex flex-col">
        <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Max</span>
        <span class="text-xs font-semibold text-slate-600">{{ formattedMax }}</span>
      </div>
      <!-- Current -->
      <div class="flex flex-col border-l border-slate-100 pl-2">
        <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Generated</span>
        <span class="text-xs font-semibold text-yellow-600">
          {{ current }} <span class="text-[10px] font-normal opacity-70">{{ unit }}</span>
        </span>
      </div>
      <!-- Final -->
      <div class="flex flex-col border-l border-slate-100 pl-2">
        <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Redeemed</span>
        <span class="text-xs font-semibold text-green-600">
          {{ final }} <span class="text-[10px] font-normal opacity-70">{{ unit }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
