import { jwtVerify } from 'jose'

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)

  // Only protect routes starting with /api/admin/
  if (!path.startsWith('/api/admin/')) {
    return
  }

  // Exclude login endpoint from auth check
  if (path === '/api/admin/auth/login') {
    return
  }

  const token = getCookie(event, 'admin_token')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Missing token',
    })
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_keep_it_safe')
    const { payload } = await jwtVerify(token, secret)
    
    // Attach admin info to context for use in event handlers if needed
    event.context.admin = payload
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid token',
    })
  }
})
