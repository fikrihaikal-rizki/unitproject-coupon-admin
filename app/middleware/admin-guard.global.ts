import { storeToRefs } from 'pinia'
import { useAdminAuthStore } from '~~/app/stores/adminAuth'

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAdminAuthStore()
  const { isAuthenticated } = storeToRefs(authStore)

  // Protect all /admin/... routes
  if (to.path.startsWith('/admin')) {
    if (!isAuthenticated.value) {
      return navigateTo('/')
    }
  }

  // If already authenticated and trying to access login page (/), redirect to admin
  if (to.path === '/' && isAuthenticated.value) {
    return navigateTo('/admin')
  }
})
