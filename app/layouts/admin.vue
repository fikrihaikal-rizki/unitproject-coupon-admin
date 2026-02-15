<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAdminAuthStore } from '~~/app/stores/adminAuth'
import {
  LayoutDashboard,
  Calendar,
  Users,
  AlertCircle,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-vue-next'

const authStore = useAdminAuthStore()
const { user } = storeToRefs(authStore)

const route = useRoute()

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { name: 'Events', icon: Calendar, path: '/admin/events' },
  { name: 'Registrations', icon: Users, path: '/admin/registrations' },
  { name: 'Coupons', icon: Calendar, path: '/admin/coupons' },
  { name: 'Error Logs', icon: AlertCircle, path: '/admin/registrations/errors' },
]

const isSidebarOpen = ref(true)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <div class="flex h-screen overflow-y-auto bg-slate-50">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed left-0 top-0 z-40 h-full bg-white border-r border-slate-200 transition-transform duration-300',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'w-64 lg:translate-x-0',
      ]"
    >
      <div class="flex h-full flex-col">
        <!-- Logo -->
        <div class="flex h-16 items-center border-b border-slate-200 px-6">
          <h1 class="text-xl font-bold text-slate-900">Admin Panel</h1>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 overflow-y-auto p-4">
          <NuxtLink
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              route.path === item.path
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ]"
          >
            <component :is="item.icon" class="h-5 w-5" />
            <span>{{ item.name }}</span>
          </NuxtLink>
        </nav>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex flex-1 flex-col lg:pl-64">
      <!-- Header -->
      <header
        class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6"
      >
        <button
          @click="toggleSidebar"
          class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu class="h-6 w-6" />
        </button>

        <div class="flex-1" />

        <!-- User Dropdown -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="gap-2">
              <Avatar class="h-8 w-8">
                <AvatarFallback>
                  {{ user?.fullname?.charAt(0) || 'A' }}
                </AvatarFallback>
              </Avatar>
              <span class="hidden sm:inline-block">{{ user?.fullname }}</span>
              <ChevronDown class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel>
              <div class="flex flex-col space-y-1">
                <p class="text-sm font-medium">{{ user?.fullname }}</p>
                <p class="text-xs text-slate-500">{{ user?.email }}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLogout" class="cursor-pointer text-red-600">
              <LogOut class="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto overflow-x-auto p-4">
        <slot />
      </main>
    </div>

    <!-- Overlay for mobile -->
    <div
      v-if="isSidebarOpen"
      @click="toggleSidebar"
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"
    />
  </div>
</template>
