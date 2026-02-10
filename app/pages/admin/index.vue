<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminAuthStore } from '~~/app/stores/adminAuth'
import { LayoutDashboard, Users, UserCheck, AlertCircle } from 'lucide-vue-next'
import { VisXYContainer, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'

definePageMeta({
  layout: 'admin'
})

const authStore = useAdminAuthStore()
const { user } = storeToRefs(authStore)

const { data: dashboardData, pending } = await useFetch('/api/admin/dashboard/stats')

const stats = computed(() => dashboardData.value?.stats || {
  totalEvents: 0,
  totalParticipants: 0,
  totalPendingParticipants: 0,
  totalPendingErrors: 0
})

const chartData = computed(() => {
  if (!dashboardData.value?.trends) return []
  return dashboardData.value.trends.map((t: any) => ({
    date: new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    value: t.count
  }))
})

const statCards = computed(() => [
  {
    title: 'Total Events',
    value: stats.value.totalEvents,
    icon: LayoutDashboard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    title: 'Total Participants',
    value: stats.value.totalParticipants,
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    title: 'Pending Participants',
    value: stats.value.totalPendingParticipants,
    icon: UserCheck,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    title: 'Pending Errors',
    value: stats.value.totalPendingErrors,
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="space-y-2">
      <h1 class="text-3xl font-bold text-slate-900">Dashboard</h1>
      <p class="text-slate-600">
        Selamat datang kembali, <strong>{{ user?.fullname }}</strong>
      </p>
    </div>

    <!-- Stats Grid -->
    <div v-if="pending" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton v-for="i in 4" :key="i" class="h-32 rounded-lg" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="stat in statCards" :key="stat.title">
        <CardContent class="p-6">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-sm font-medium text-slate-600">{{ stat.title }}</p>
              <p class="text-3xl font-bold text-slate-900">{{ stat.value }}</p>
            </div>
            <div :class="['rounded-full p-3', stat.bgColor]">
              <component :is="stat.icon" :class="['h-6 w-6', stat.color]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Chart -->
    <Card>
      <CardHeader>
        <CardTitle>Registration Trends (Last 7 Days)</CardTitle>
        <CardDescription>Daily registration activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="pending" class="h-64">
          <Skeleton class="h-full w-full" />
        </div>
        <div v-else-if="chartData.length > 0" class="h-64">
          <VisXYContainer :data="chartData" :height="250">
            <VisLine
              :x="(d: any) => chartData.indexOf(d)"
              :y="(d: any) => d.value"
              color="#3b82f6"
            />
            <VisAxis type="x" :tickFormat="(i: number) => chartData[i]?.date || ''" />
            <VisAxis type="y" label="Registrations" />
            <VisCrosshair />
            <VisTooltip />
          </VisXYContainer>
        </div>
        <div v-else class="flex h-64 items-center justify-center text-slate-500">
          No registration data available
        </div>
      </CardContent>
    </Card>
  </div>
</template>
