<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
  getLocalTimeZone,
  today,
  parseDate,
  parseDateTime,
  parseAbsoluteToLocal,
} from "@internationalized/date";
import {
  format,
  addHours,
  differenceInMinutes,
  isBefore,
  setHours,
  setMinutes,
  parseISO,
  isValid,
} from "date-fns";
import { CalendarIcon, Clock } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RangeCalendar } from "@/components/ui/range-calendar";
import { cn } from "@/lib/utils";

const props = defineProps<{
  type: string;
  startAt: Date | undefined;
  endAt: Date | undefined;
  startPeriodLimit: Date;
}>();

const emits = defineEmits<{
  "update:startAt": [value: Date];
  "update:endAt": [value: Date];
}>();

function parseToCalendarDate(date: any) {
  const calendarDate = parseAbsoluteToLocal(date.toISOString());
  const newDate = new Date(
    calendarDate.year,
    calendarDate.month,
    calendarDate.day,
  );

  return parseDate(format(newDate, "yyyy-MM-dd"));
}

// Internal range state for the calendar
const range = ref<any>({
  start: props.startAt ? parseToCalendarDate(props.startAt) : undefined,
  end: props.endAt ? parseToCalendarDate(props.endAt) : undefined,
});

const startTime = ref(props.startAt ? format(props.startAt, "HH:mm") : "09:00");
const endTime = ref(props.endAt ? format(props.endAt, "HH:mm") : "10:00");

// Initialize defaults if not provided
onMounted(() => {
  if (!props.startAt) {
    const defaultStart =
      props.startPeriodLimit > new Date() ? props.startPeriodLimit : new Date();
    emits("update:startAt", defaultStart);
    startTime.value = format(defaultStart, "HH:mm");

    if (!props.endAt) {
      const defaultEnd = addHours(defaultStart, 1);
      emits("update:endAt", defaultEnd);
      endTime.value = format(defaultEnd, "HH:mm");
    }
  }
});

function combineDateTime(dateVal: any, timeStr: string): Date | undefined {
  if (!dateVal) return undefined;

  // Handle both Date objects and string representations from RangeCalendar
  const date = new Date(dateVal.toString());
  const timeParts = timeStr.split(":");
  const hours = parseInt(timeParts[0] || "0", 10);
  const minutes = parseInt(timeParts[1] || "0", 10);

  if (isNaN(date.getTime()) || isNaN(hours) || isNaN(minutes)) return undefined;

  const newDate = new Date(date);
  newDate.setHours(hours);
  newDate.setMinutes(minutes);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);

  return newDate;
}

watch(
  [range, startTime, endTime],
  () => {
    if (range.value.start) {
      const start = combineDateTime(range.value.start, startTime.value);
      if (start) emits("update:startAt", start);

      if (range.value.end) {
        const end = combineDateTime(range.value.end, endTime.value);
        if (end) emits("update:endAt", end);
      } else if (start) {
        // If only start date is selected, assume same date for end
        const end = combineDateTime(range.value.start, endTime.value);
        if (end) emits("update:endAt", end);
      }
    }
  },
  { deep: true },
);

const durationSummary = computed(() => {
  if (
    !props.startAt ||
    !props.endAt ||
    !isValid(props.startAt) ||
    !isValid(props.endAt)
  ) {
    return `Please select a valid ${props.type.toLowerCase()} period.`;
  }

  const diffMinutes = differenceInMinutes(props.endAt, props.startAt);
  if (diffMinutes < 0) return "End time cannot be before start time.";

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `The ${props.type.toLowerCase()} starts at ${format(props.startAt, "PPp")} and ends at ${format(props.endAt, "PPp")}. Total duration: ${hours}h ${minutes}m.`;
});

function formatDateRange(r: any) {
  if (!r.start) return "Select date range";
  if (!r.end) return format(new Date(r.start.toString()), "dd MMM yyyy");
  return `${format(new Date(r.start.toString()), "dd MMM yyyy")} - ${format(new Date(r.end.toString()), "dd MMM yyyy")}`;
}

// Function to disable dates before startPeriodLimit
const isDateDisabled = (date: any) => {
  const d = new Date(date.toString());
  // Compare by date only
  const limit = new Date(props.startPeriodLimit);
  limit.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < limit;
};
</script>

<template>
  <div class="space-y-4 rounded-lg border p-4 bg-white shadow-sm">
    <div class="flex items-center gap-2">
      <div class="h-8 w-1 rounded-full bg-primary" />
      <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
        {{ type }} Period
      </h3>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-2">
        <Label>Date Range</Label>
        <Popover>
          <PopoverTrigger as-child>
            <Button
              variant="outline"
              :class="
                cn(
                  'w-full justify-start text-left font-normal h-10',
                  !range.start && 'text-muted-foreground',
                )
              "
            >
              <CalendarIcon class="mr-2 h-4 w-4" />
              {{ formatDateRange(range) }}
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="start">
            <RangeCalendar
              v-model="range"
              initial-focus
              :is-date-disabled="isDateDisabled"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-2">
          <Label>Start Time</Label>
          <div class="relative">
            <Clock
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <Input v-model="startTime" type="time" class="pl-9" />
          </div>
        </div>
        <div class="space-y-2">
          <Label>End Time</Label>
          <div class="relative">
            <Clock
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <Input v-model="endTime" type="time" class="pl-9" />
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-md bg-slate-50 p-3">
      <p class="text-sm leading-relaxed text-slate-600">
        {{ durationSummary }}
      </p>
    </div>
  </div>
</template>
