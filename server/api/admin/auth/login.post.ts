import { SignJWT } from 'jose'
import prisma from '~~/server/utils/prisma'
import { md5Hash } from '~~/server/utils/crypt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required',
    })
  }

  // 1. Find the Administrator by email where isActive is true
  const admin = await prisma.administrator.findFirst({
    where: {
      email,
      isActive: true,
    },
    include: {
      _count: {
        select: { eventAdmins: true }
      }
    }
  })

  // 2. Security: Prevent login if isActive is false and where minimum event count is one
  if (!admin || admin._count.eventAdmins === 0) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials or inactive account',
    })
  }

  // 3. Validate the password (use MD5 comparison)
  if (admin.password !== md5Hash(password)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials',
    })
  }

  // 4. If valid, generate a JWT Token containing adminId and email in the payload
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_keep_it_safe')
  const token = await new SignJWT({ adminId: admin.id, email: admin.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)

  // 5. Set the JWT as an HttpOnly Cookie (e.g., admin_token)
  setCookie(event, 'admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  // Remove password from response
  const { password: _, ...adminWithoutPassword } = admin

  return {
    message: 'Login successful',
    user: adminWithoutPassword
  }
})
