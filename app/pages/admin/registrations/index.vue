<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { Search, Users, Eye } from "lucide-vue-next";
import { format } from "date-fns";
import { useDebounceFn } from "@vueuse/core";
import { toast } from "vue-sonner";

definePageMeta({
  layout: "admin",
});

const page = ref(1);
const limit = ref(10);
const search = ref("");
const statusFilter = ref("");
const eventFilter = ref("");

const queryParams = computed(() => ({
  page: page.value,
  limit: limit.value,
  search: search.value,
  status: statusFilter.value,
  eventId: eventFilter.value,
}));

const { data, pending, refresh } = await useFetch(
  "/api/admin/registrations/list",
  {
    query: queryParams,
  },
);

// Fetch events for the filter dropdown
const { data: eventsData, pending: eventsPending } = await useFetch(
  "/api/admin/events/list",
);

const events = computed(() => eventsData.value?.data || []);

const registrations = computed(() => data.value?.data || []);
const pagination = computed(
  () => data.value?.pagination || { page: 1, totalPages: 1, total: 0 },
);

const selectedRegistration = ref<any>(null);
const isDetailOpen = ref(false);
const isUpdatingStatus = ref(false);

function getWhatsAppLink(phone: string | null) {
  if (!phone) return "#";
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}`;
}

// Auto-select nearest event on mount
onMounted(() => {
  if (events.value.length > 0) {
    const now = new Date();
    const activeEvents = events.value.filter(e => e.startAt);
    if (activeEvents.length > 0) {
      const nearestEvent = activeEvents.reduce((nearest, event) => {
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
const debouncedSearch = useDebounceFn(() => {
  page.value = 1;
  refresh();
}, 300);

// Watch search input for debounced refresh
watch(search, () => {
  debouncedSearch();
});

function handleSearch() {
  page.value = 1;
  refresh();
}

function changePage(newPage: number) {
  page.value = newPage;
  refresh();
}

function formatDate(date: string | Date | null) {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

async function viewDetail(id: number) {
  try {
    const response = await $fetch(`/api/admin/registrations/${id}`);
    selectedRegistration.value = response;
    isDetailOpen.value = true;
  } catch (error) {
    console.error("Failed to fetch registration detail:", error);
    toast({
      title: "Error",
      description: "Failed to load registration details",
      variant: "destructive",
    });
  }
}

function closeDetail() {
  isDetailOpen.value = false;
  selectedRegistration.value = null;
}

function isImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
  ];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.includes(ext));
}

async function updateStatus(newStatus: string) {
  if (!selectedRegistration.value) return;

  try {
    isUpdatingStatus.value = true;
    await $fetch(
      `/api/admin/registrations/${selectedRegistration.value.id}/status`,
      {
        method: "PATCH",
        body: {
          status: newStatus,
        },
      },
    );

    toast({
      title: "Success",
      description: "Registration status updated successfully",
    });

    // Refresh the table data
    await refresh();

    // Update the selected registration status
    selectedRegistration.value.status = newStatus;
  } catch (error) {
    console.error("Failed to update status:", error);
    toast({
      title: "Error",
      description: "Failed to update registration status",
      variant: "destructive",
    });
  } finally {
    isUpdatingStatus.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold text-slate-900">Participant Management</h1>
      <p class="text-slate-600">Kelola semua partisipan yang terdaftar.</p>
    </div>

    <!-- Filters -->
    <Card>
      <CardContent class="p-4">
        <div class="flex flex-col gap-4 sm:flex-row">
          <!-- Search Input -->
          <div class="flex-1">
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <Input
                v-model="search"
                placeholder="Search by name, email, phone, or seat value..."
                class="pl-9"
              />
            </div>
          </div>
          <!-- Filter Row -->
          <Select v-model="eventFilter" @update:model-value="handleSearch">
            <SelectTrigger class="w-full sm:w-64">
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
          <Select v-model="statusFilter" @update:model-value="handleSearch">
            <SelectTrigger class="w-full sm:w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <!-- Data Table -->
    <Card>
      <CardContent class="p-0">
        <div v-if="pending" class="p-8">
          <Skeleton class="h-96 w-full" />
        </div>
        <div
          v-else-if="registrations.length === 0"
          class="flex h-64 flex-col items-center justify-center p-8"
        >
          <Users class="h-16 w-16 text-slate-300" />
          <h3 class="mt-4 text-lg font-medium text-slate-900">
            No registrations found
          </h3>
          <p class="mt-2 text-sm text-slate-600">Try adjusting your filters.</p>
        </div>
        <div v-else class="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registered At</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Seat Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="reg in registrations" :key="reg.id">
                <TableCell class="whitespace-nowrap">
                  {{ formatDate(reg.registeredAt) }}
                </TableCell>
                <TableCell>
                  {{ reg.customer?.fullName || "-" }}
                </TableCell>
                <TableCell>
                  {{ reg.customer?.email || "-" }}
                </TableCell>
                <TableCell>
                  <a
                    v-if="reg.customer?.phoneNumber"
                    :href="getWhatsAppLink(reg.customer.phoneNumber)"
                    target="_blank"
                    class="text-blue-600 hover:underline"
                  >
                    {{ reg.customer.phoneNumber }}
                  </a>
                  <span v-else>-</span>
                </TableCell>
                <TableCell>
                  <code
                    v-if="reg.claimSeatValue"
                    class="rounded bg-slate-100 px-2 py-1 text-sm"
                  >
                    {{ reg.claimSeatValue }}
                  </code>
                  <span v-else class="text-slate-400">-</span>
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="
                      reg.status === 'completed'
                        ? 'default'
                        : reg.status === 'pending'
                          ? 'secondary'
                          : 'outline'
                    "
                  >
                    {{ reg.status }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <Button variant="ghost" size="sm" @click="viewDetail(reg.id)">
                    <Eye class="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter
        v-if="pagination.totalPages > 1"
        class="flex items-center justify-between border-t p-4"
      >
        <p class="text-sm text-slate-600">
          Showing {{ (pagination.page - 1) * limit + 1 }} to
          {{ Math.min(pagination.page * limit, pagination.total) }} of
          {{ pagination.total }} results
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="pagination.page === 1"
            @click="changePage(pagination.page - 1)"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
          >
            Next
          </Button>
        </div>
      </CardFooter>
    </Card>

    <!-- Detail Dialog -->
    <Dialog :open="isDetailOpen" @update:open="closeDetail">
      <DialogContent class="overflow-y-scroll max-h-screen no-scrollbar">
        <DialogHeader>
          <DialogTitle>Registration Details</DialogTitle>
          <DialogDescription>
            Complete information about this registration
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedRegistration" class="space-y-6">
          <!-- Event & Customer Info -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <p class="text-sm font-medium text-slate-600">Event</p>
              <p class="text-base font-semibold">
                {{ selectedRegistration.event?.title }}
              </p>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium text-slate-600">Status</p>
              <Badge>{{ selectedRegistration.status }}</Badge>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium text-slate-600">Customer Name</p>
              <p class="text-base">
                {{ selectedRegistration.customer?.fullName || "-" }}
              </p>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium text-slate-600">Email</p>
              <p class="text-base">
                {{ selectedRegistration.customer?.email || "-" }}
              </p>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium text-slate-600">Phone</p>
              <p class="text-base text-blue-600">
                <a
                  v-if="selectedRegistration.customer?.phoneNumber"
                  :href="
                    getWhatsAppLink(selectedRegistration.customer.phoneNumber)
                  "
                  target="_blank"
                  class="hover:underline"
                >
                  {{ selectedRegistration.customer.phoneNumber }}
                </a>
                <span v-else>-</span>
              </p>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-medium text-slate-600">Registered At</p>
              <p class="text-base">
                {{ formatDate(selectedRegistration.registeredAt) }}
              </p>
            </div>
          </div>

          <Separator />

          <!-- Questionnaire Answers -->
          <div
            v-if="selectedRegistration.answers?.length > 0"
            class="space-y-4"
          >
            <h3 class="text-lg font-semibold">Questionnaire Answers</h3>
            <div class="space-y-3">
              <div
                v-for="answer in selectedRegistration.answers"
                :key="answer.id"
                class="rounded-lg border p-3"
              >
                <p class="text-sm font-medium text-slate-600">
                  {{ answer.question?.label }}
                </p>
                <div v-if="isImageUrl(answer.answerValue)" class="mt-2">
                  <NuxtImg
                    :src="answer.answerValue"
                    :alt="answer.question?.label || 'Answer image'"
                    class="max-w-full h-auto rounded-lg border"
                    loading="lazy"
                  />
                  <p class="mt-1 text-sm text-slate-500 break-all">
                    {{ answer.answerValue }}
                  </p>
                </div>
                <p v-else class="mt-1 text-base">{{ answer.answerValue }}</p>
              </div>
            </div>
          </div>
          <div v-else class="rounded-lg border border-dashed p-6 text-center">
            <p class="text-sm text-slate-500">
              No questionnaire answers available
            </p>
          </div>

          <Separator />

          <!-- Status Update Section -->
          <div class="space-y-3">
            <h3 class="text-lg font-semibold">Update Status</h3>
            <div class="flex flex-wrap gap-2">
              <Button
                :disabled="
                  isUpdatingStatus ||
                  selectedRegistration.status === 'completed'
                "
                @click="updateStatus('completed')"
              >
                Mark as Completed
              </Button>
              <Button
                variant="outline"
                :disabled="
                  isUpdatingStatus || selectedRegistration.status === 'pending'
                "
                @click="updateStatus('pending')"
              >
                Mark as Pending
              </Button>
              <Button
                variant="destructive"
                :disabled="
                  isUpdatingStatus ||
                  selectedRegistration.status === 'cancelled'
                "
                @click="updateStatus('cancelled')"
              >
                Mark as Cancelled
              </Button>
              <Button
                variant="secondary"
                :disabled="
                  isUpdatingStatus || selectedRegistration.status === 'active'
                "
                @click="updateStatus('active')"
              >
                Mark as Active
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeDetail">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
