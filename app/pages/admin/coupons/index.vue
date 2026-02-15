<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  Ticket,
  Eye,
} from "lucide-vue-next";
import { format, isBefore, parseISO } from "date-fns";
import { useDebounceFn } from "@vueuse/core";

definePageMeta({
  layout: "admin",
});

const search = ref("");
const eventFilter = ref("");

// Range states for the pickers
const genRange = ref<any>({ start: undefined, end: undefined });
const redeemRange = ref<any>({ start: undefined, end: undefined });

// Computed strings for the API
const genFrom = computed(() =>
  genRange.value.start ? genRange.value.start.toString() : "",
);
const genUntil = computed(() =>
  genRange.value.end ? genRange.value.end.toString() : "",
);
const redeemFrom = computed(() =>
  redeemRange.value.start ? redeemRange.value.start.toString() : "",
);
const redeemUntil = computed(() =>
  redeemRange.value.end ? redeemRange.value.end.toString() : "",
);

const queryParams = computed(() => ({
  search: search.value,
  eventId: eventFilter.value,
  allowGenerateFrom: genFrom.value,
  allowGenerateUntil: genUntil.value,
  redeemFrom: redeemFrom.value,
  redeemUntil: redeemUntil.value,
}));

const { data, pending, refresh } = await useFetch("/api/admin/coupons", {
  query: queryParams,
});

// Fetch events for the filter dropdown
const { data: eventsData } = await useFetch("/api/admin/events/list");

const events = computed(() => eventsData.value?.data || []);
const coupons = computed(() => (data.value as any)?.data || []);

// Auto-select nearest event on load
onMounted(async () => {
  if (events.value.length > 0) {
    const now = new Date();
    // Use events from eventsData to find nearest
    const eventList = events.value;
    const activeEvents = eventList.filter((e: any) => e.startAt);

    if (activeEvents.length > 0) {
      const nearestEvent = activeEvents.reduce((nearest: any, event: any) => {
        const eventDate = new Date(event.startAt!);
        const nearestDate = new Date(nearest.startAt!);
        const eventDiff = Math.abs(eventDate.getTime() - now.getTime());
        const nearestDiff = Math.abs(nearestDate.getTime() - now.getTime());
        return eventDiff < nearestDiff ? event : nearest;
      });
      eventFilter.value = nearestEvent.id;
    }
  }
});

// Debounced search function
const debouncedRefresh = useDebounceFn(() => {
  refresh();
}, 300);

// Watch filters for refresh
watch([search, eventFilter, genRange, redeemRange], () => {
  debouncedRefresh();
});

function formatDate(
  date: string | Date | null,
  formatStr: string = "dd MMM yyyy",
) {
  if (!date) return "-";
  return format(new Date(date), formatStr);
}

function formatRange(range: { start?: any; end?: any }) {
  if (!range.start) return "Select date range";
  if (!range.end) return formatDate(range.start.toString());
  return `${formatDate(range.start.toString())} - ${formatDate(range.end.toString())}`;
}

const selectedEventId = ref("");
const selectedEvent = computed(() =>
  events.value.find((e: any) => e.id === selectedEventId.value),
);

function navigateToCreate() {
  if (!selectedEvent.value) return;

  const event = selectedEvent.value;
  const query = {
    eventId: event.id,
    eventName: event.title,
    eventStart: event.startAt,
  };

  navigateTo({
    path: "/admin/coupons/create",
    query,
  });
}

function resetFilters() {
  search.value = "";
  eventFilter.value = "-";
  genRange.value = { start: undefined, end: undefined };
  redeemRange.value = { start: undefined, end: undefined };
}

// View dialog state
const viewDialogOpen = ref(false);
const selectedCoupon = ref<any>(null);

function openViewDialog(coupon: any) {
  selectedCoupon.value = coupon;
  viewDialogOpen.value = true;
}

function closeViewDialog() {
  viewDialogOpen.value = false;
  selectedCoupon.value = null;
}

// Check if coupon can be updated (now < redeemFrom)
function canUpdateCoupon(redeemFrom: string) {
  const now = new Date();
  const redeemDate = parseISO(redeemFrom);
  return isBefore(now, redeemDate);
}

function navigateToUpdate(couponId: number) {
  navigateTo(`/admin/coupons/update/${couponId}`);
  closeViewDialog();
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h1 class="text-3xl font-bold text-slate-900">Coupon Management</h1>
        <p class="text-slate-600">
          Kelola kupon event dan pantau penggunaannya.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="resetFilters"> Reset Filters </Button>

        <Dialog>
          <DialogTrigger as-child>
            <Button>
              <Plus class="mr-2 h-4 w-4" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
              <DialogDescription>
                Select an event to create a coupon for.
              </DialogDescription>
            </DialogHeader>

            <div class="space-y-4 py-4">
              <div class="space-y-2">
                <Label>Select Event</Label>
                <Select v-model="selectedEventId">
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="event in events"
                      :key="event.id"
                      :value="event.id"
                    >
                      {{ event.title }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                v-if="selectedEvent"
                class="rounded-lg bg-slate-50 p-4 space-y-2"
              >
                <p class="text-sm font-medium text-slate-900 leading-none">
                  Event Schedule
                </p>
                <div class="grid grid-cols-2 gap-4 text-sm text-slate-600">
                  <div class="space-y-1">
                    <p class="text-xs text-slate-400">Starts At</p>
                    <p>{{ formatDate(selectedEvent.startAt, "PPp") }}</p>
                  </div>
                  <div class="space-y-1">
                    <p class="text-xs text-slate-400">Ends At</p>
                    <p>{{ formatDate(selectedEvent.endAt, "PPp") }}</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                :disabled="!selectedEventId"
                class="w-full"
                @click="navigateToCreate"
              >
                Create Coupons
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <!-- Filters Section -->
    <Card>
      <CardContent>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <!-- Search -->
          <div>
            <label class="text-sm font-medium text-slate-700">Search</label>
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <Input
                v-model="search"
                placeholder="Name or code..."
                class="pl-9"
              />
            </div>
          </div>

          <!-- Generation Period -->
          <div>
            <label class="text-sm font-medium text-slate-700"
              >Generation Period</label
            >
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  class="w-full justify-start px-3 text-left font-normal text-xs h-9"
                >
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{ formatRange(genRange) }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <RangeCalendar v-model="genRange" initial-focus />
              </PopoverContent>
            </Popover>
          </div>

          <!-- Redemption Period -->
          <div>
            <label class="text-sm font-medium text-slate-700"
              >Redemption Period</label
            >
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  class="w-full justify-start px-3 text-left font-normal text-xs h-9"
                >
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{ formatRange(redeemRange) }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <RangeCalendar v-model="redeemRange" initial-focus />
              </PopoverContent>
            </Popover>
          </div>

          <!-- Event Selector -->
          <div>
            <label class="text-sm font-medium text-slate-700">Event</label>
            <Select v-model="eventFilter">
              <SelectTrigger>
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">All Events</SelectItem>
                <SelectItem
                  v-for="event in events"
                  :key="event.id"
                  :value="event.id"
                >
                  {{ event.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Data Table Section -->
    <Card>
      <CardContent class="p-0">
        <div v-if="pending" class="p-8">
          <Skeleton class="h-64 w-full" />
        </div>
        <div
          v-else-if="coupons.length === 0"
          class="flex h-64 flex-col items-center justify-center p-8 text-center"
        >
          <Ticket class="h-12 w-12 text-slate-300" />
          <h3 class="mt-4 text-lg font-medium text-slate-900">
            No coupons found
          </h3>
          <p class="mt-2 text-sm text-slate-600">
            Try adjusting your filters or create a new one.
          </p>
        </div>
        <div v-else class="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coupon Info</TableHead>
                <TableHead>Generation Period</TableHead>
                <TableHead>Redemption Period</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead class="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="coupon in coupons" :key="coupon.id">
                <TableCell>
                  <div class="space-y-1">
                    <p class="font-medium text-slate-900">{{ coupon.name }}</p>
                    <code
                      class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-700"
                    >
                      {{ coupon.code }}
                    </code>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-1.5 text-xs text-slate-600">
                    <CalendarIcon class="h-3.5 w-3.5" />
                    <span
                      >{{ formatDate(coupon.allowGenerateFrom) }} —
                      {{ formatDate(coupon.allowGenerateUntil) }}</span
                    >
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-1.5 text-xs text-slate-600">
                    <CalendarIcon class="h-3.5 w-3.5" />
                    <span
                      >{{ formatDate(coupon.redeemFrom) }} —
                      {{ formatDate(coupon.redeemUntil) }}</span
                    >
                  </div>
                </TableCell>
                <TableCell>
                  <div class="space-y-2 min-w-[120px]">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-medium">
                        {{ coupon.totalGenerated }} /
                        {{ coupon.maxQuota || "∞" }}
                      </span>
                      <span v-if="coupon.maxQuota" class="text-slate-400">
                        {{
                          Math.round(
                            (coupon.totalGenerated / coupon.maxQuota) * 100,
                          )
                        }}%
                      </span>
                    </div>
                    <div
                      v-if="coupon.maxQuota"
                      class="h-1.5 w-full rounded-full bg-slate-100"
                    >
                      <div
                        class="h-full rounded-full bg-blue-600 transition-all"
                        :style="{
                          width: `${Math.min((coupon.totalGenerated / coupon.maxQuota) * 100, 100)}%`,
                        }"
                      />
                    </div>
                    <div v-else class="h-1.5 w-full rounded-full bg-slate-100">
                      <div class="h-full w-1/4 rounded-full bg-slate-300" />
                    </div>
                  </div>
                </TableCell>
                <TableCell class="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openViewDialog(coupon)"
                  >
                    <Eye class="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    <!-- View Coupon Dialog -->
    <!-- Add this after the closing </Card> tag and before the final </div> -->
    <Dialog v-model:open="viewDialogOpen">
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Coupon Details</DialogTitle>
          <DialogDescription>
            View and manage coupon information
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedCoupon" class="space-y-6">
          <!-- Basic Info -->
          <div class="space-y-3">
            <h4 class="font-semibold text-slate-900">Basic Information</h4>
            <div class="grid gap-3">
              <div class="grid grid-cols-3 gap-2">
                <span class="text-sm text-slate-500">Name:</span>
                <span class="col-span-2 text-sm font-medium">{{
                  selectedCoupon.name
                }}</span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <span class="text-sm text-slate-500">Code:</span>
                <code
                  class="col-span-2 rounded bg-slate-100 px-2 py-1 text-sm font-mono"
                >
                  {{ selectedCoupon.code }}
                </code>
              </div>
              <div
                v-if="selectedCoupon.description"
                class="grid grid-cols-3 gap-2"
              >
                <span class="text-sm text-slate-500">Description:</span>
                <div
                  class="col-span-2 text-sm"
                  v-html="selectedCoupon.description"
                ></div>
              </div>
            </div>
          </div>

          <!-- Period Info -->
          <div class="space-y-3">
            <h4 class="font-semibold text-slate-900">Period Information</h4>
            <div class="grid gap-3">
              <div class="grid grid-cols-3 gap-2">
                <span class="text-sm text-slate-500">Generation:</span>
                <span class="col-span-2 text-sm">
                  {{ formatDate(selectedCoupon.allowGenerateFrom) }} —
                  {{ formatDate(selectedCoupon.allowGenerateUntil) }}
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <span class="text-sm text-slate-500">Redemption:</span>
                <span class="col-span-2 text-sm">
                  {{ formatDate(selectedCoupon.redeemFrom) }} —
                  {{ formatDate(selectedCoupon.redeemUntil) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Usage Info -->
          <div class="space-y-3">
            <h4 class="font-semibold text-slate-900">Usage Statistics</h4>
            <div class="grid gap-3">
              <div class="grid grid-cols-3 gap-2">
                <span class="text-sm text-slate-500">Generated:</span>
                <span class="col-span-2 text-sm font-medium">
                  {{ selectedCoupon.totalGenerated }} /
                  {{ selectedCoupon.maxQuota || "∞" }}
                </span>
              </div>
              <div
                v-if="selectedCoupon.maxQuota"
                class="grid grid-cols-3 gap-2"
              >
                <span class="text-sm text-slate-500">Progress:</span>
                <div class="col-span-2 space-y-1">
                  <div class="h-2 w-full rounded-full bg-slate-100">
                    <div
                      class="h-full rounded-full bg-blue-600 transition-all"
                      :style="{
                        width: `${Math.min((selectedCoupon.totalGenerated / selectedCoupon.maxQuota) * 100, 100)}%`,
                      }"
                    />
                  </div>
                  <span class="text-xs text-slate-400">
                    {{
                      Math.round(
                        (selectedCoupon.totalGenerated /
                          selectedCoupon.maxQuota) *
                          100,
                      )
                    }}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Update Button with Lock Message -->
          <div class="space-y-3 pt-4 border-t">
            <div
              v-if="!canUpdateCoupon(selectedCoupon.redeemFrom)"
              class="rounded-lg bg-amber-50 border border-amber-200 p-3"
            >
              <p class="text-sm text-amber-800">
                ⚠️ Editing locked: Redemption period has started
              </p>
            </div>
            <Button
              class="w-full"
              :disabled="!canUpdateCoupon(selectedCoupon.redeemFrom)"
              @click="navigateToUpdate(selectedCoupon.id)"
            >
              Update Coupon
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
