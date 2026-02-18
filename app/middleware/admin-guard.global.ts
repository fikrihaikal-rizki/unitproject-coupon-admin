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

    // If authenticated as operator, restrict to /operator/scan
    const user: any = authStore.user
    if (user?.role === 'operator') {
      return navigateTo('/operator/scan')
    }
  }

  // If already authenticated and trying to access login page (/), redirect based on role
  if (to.path === '/' && isAuthenticated.value) {
    const user: any = authStore.user
    if (user?.role === 'operator') {
      return navigateTo('/operator/scan')
    }
    return navigateTo('/admin')
  }
})
