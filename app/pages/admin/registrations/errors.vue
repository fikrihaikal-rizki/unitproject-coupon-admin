<script setup lang="ts">
import { ref, computed } from "vue";
import { Search, AlertCircle } from "lucide-vue-next";
import { format } from "date-fns";

definePageMeta({
  layout: "admin",
});

const page = ref(1);
const limit = ref(10);
const search = ref("");
const statusFilter = ref("");

const queryParams = computed(() => ({
  page: page.value,
  limit: limit.value,
  search: search.value,
  status: statusFilter.value,
}));

const { data, pending, refresh } = await useFetch(
  "/api/admin/registrations/errors",
  {
    query: queryParams,
  },
);

const errors = computed(() => data.value?.data || []);
const pagination = computed(
  () => data.value?.pagination || { page: 1, totalPages: 1, total: 0 },
);

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
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-3xl font-bold text-slate-900">Claim Seat Error Logs</h1>
      <p class="text-slate-600">
        Monitor dan kelola error yang terjadi saat claim seat.
      </p>
    </div>

    <!-- Filters -->
    <Card>
      <CardContent class="p-4">
        <div class="flex flex-col gap-4 sm:flex-row">
          <div class="flex-1">
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <Input
                v-model="search"
                placeholder="Search by customer, email, or value..."
                class="pl-9"
                @keyup.enter="handleSearch"
              />
            </div>
          </div>
          <Select v-model="statusFilter" @update:model-value="handleSearch">
            <SelectTrigger class="w-full sm:w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button @click="handleSearch"> Apply Filters </Button>
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
          v-else-if="errors.length === 0"
          class="flex h-64 flex-col items-center justify-center p-8"
        >
          <AlertCircle class="h-16 w-16 text-slate-300" />
          <h3 class="mt-4 text-lg font-medium text-slate-900">
            No errors found
          </h3>
          <p class="mt-2 text-sm text-slate-600">Try adjusting your filters.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created At</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Value Tried</TableHead>
                <TableHead>Error Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="error in errors" :key="error.id">
                <ClientOnly>
                  <TableCell class="whitespace-nowrap">
                    {{ formatDate(error.createdAt) }}
                  </TableCell>
                </ClientOnly>
                <TableCell class="font-medium">
                  {{ error.event?.title || "-" }}
                </TableCell>
                <TableCell>
                  {{ error.customer?.fullName || "-" }}
                </TableCell>
                <TableCell>
                  {{ error.customer?.email || "-" }}
                </TableCell>
                <TableCell>
                  {{ error.customer?.phoneNumber || "-" }}
                </TableCell>
                <TableCell>
                  <code class="rounded bg-slate-100 px-2 py-1 text-sm">
                    {{ error.triedValue || "-" }}
                  </code>
                </TableCell>
                <TableCell class="max-w-xs">
                  <div class="truncate" :title="error.errorMessage">
                    {{ error.errorMessage }}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="
                      error.status === 'open' ? 'destructive' : 'default'
                    "
                  >
                    {{ error.status }}
                  </Badge>
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
  </div>
</template>
