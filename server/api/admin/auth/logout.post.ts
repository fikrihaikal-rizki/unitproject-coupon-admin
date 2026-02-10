export default defineEventHandler((event) => {
  deleteCookie(event, 'admin_token')
  deleteCookie(event, 'admin_user')
  
  return {
    message: 'Logged out successfully'
  }
})
