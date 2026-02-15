<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

const props = defineProps<{
  title: string
  isMaxNumber: boolean
  maxNumber: number
}>()

const emits = defineEmits<{
  'update:isMaxNumber': [value: boolean]
  'update:maxNumber': [value: number]
}>()

const isMaxNumberModel = computed({
  get: () => props.isMaxNumber,
  set: (val) => emits('update:isMaxNumber', val)
})

const maxNumberModel = computed({
  get: () => props.maxNumber,
  set: (val) => {
    if (val === 0) {
      emits('update:isMaxNumber', false)
      emits('update:maxNumber', 0)
    } else {
      emits('update:maxNumber', val)
    }
  }
})

const isInputDisabled = computed(() => {
  return props.maxNumber === 0
})
</script>

<template>
  <div class="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
    <div class="space-y-0.5">
      <Label class="text-base">{{ title }}</Label>
      <p class="text-sm text-slate-500">
        {{ isMaxNumber ? 'Limit the number of uses for this coupon.' : 'Unlimited uses for this coupon.' }}
      </p>
    </div>
    <div class="flex items-center gap-4">
      <div v-if="isMaxNumber" class="flex items-center gap-2">
        <Input
          v-model.number="maxNumberModel"
          type="number"
          min="1"
          class="w-32"
          :disabled="isInputDisabled"
        />
        <span class="text-sm text-slate-500 font-medium whitespace-nowrap">uses</span>
      </div>
      <div class="flex items-center h-10 px-2">
        <!-- Using Checkbox for now as Switch is not available in UI components -->
        <Checkbox 
          v-model="isMaxNumberModel"
          :disabled="maxNumberModel === 0"
        />
      </div>
    </div>
  </div>
</template>
