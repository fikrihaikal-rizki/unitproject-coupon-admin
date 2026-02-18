import { defineStore } from 'pinia'

interface AdminUser {
  id: number
  email: string
  fullname: string
  isActive: boolean
  role: 'admin' | 'operator'
}

export const useAdminAuthStore = defineStore('adminAuth', () => {
  // --- State ---
  const user = useCookie<AdminUser | null>('admin_user', {
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: 'strict',
  })

  // --- Getters ---
  const isAuthenticated = computed(() => !!user.value)
  const adminInfo = computed(() => user.value)

  // --- Actions ---
  async function login(credentials: { email: string; password: any }) {
    try {
      const data = await $fetch('/api/admin/auth/login', {
        method: 'POST',
        body: credentials,
      })
      user.value = data.user as AdminUser
      return { success: true }
    } catch (error: any) {
      return { 
        success: false, 
        message: error.data?.statusMessage || 'Login failed' 
      }
    }
  }

  async function logout() {
    try {
      await $fetch('/api/admin/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    user.value = null
    await navigateTo('/')
  }

  return {
    user,
    isAuthenticated,
    adminInfo,
    login,
    logout
  }
})
