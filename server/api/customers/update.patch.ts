import prisma from "~~/server/utils/prisma"

import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const { fullName, phoneNumber } = body

  if (!fullName || !phoneNumber) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Full name and phone number are required',
    })
  }

  const customer = await prisma.customer.update({
    where: { id: user.sub },
    data: {
      fullName,
      phoneNumber
    },
  })

  return customer
})
