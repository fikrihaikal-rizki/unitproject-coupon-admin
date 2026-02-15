import { couponFormSchema } from '~~/app/utils/schemas/coupon'
import { nanoid } from 'nanoid'
import prisma from '~~/server/utils/prisma'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  // TODO: Add proper admin authorization here if not handled by middleware
  // const session = await requireAdminSession(event) 

  const body = await readBody(event)

  // Validate request body
  let parsedBody
  try {
    // We might need to preprocess dates if they come as strings
    parsedBody = await couponFormSchema.parseAsync(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: error.issues
      })
    }
    throw error
  }

  // Check for duplicate code in the same event
  const existingCoupon = await prisma.eventCoupon.findFirst({
    where: {
      eventId: parsedBody.eventId,
      code: parsedBody.code
    }
  })

  if (existingCoupon) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Coupon code already exists for this event'
    })
  }

  // Generate unique slug
  const slug = nanoid(8)

  try {
    const coupon = await prisma.eventCoupon.create({
      data: {
        eventId: parsedBody.eventId,
        name: parsedBody.name,
        code: parsedBody.code,
        slug,
        description: parsedBody.description,
        allowGenerateFrom: new Date(parsedBody.allowGenerateFrom),
        allowGenerateUntil: new Date(parsedBody.allowGenerateUntil),
        redeemFrom: new Date(parsedBody.redeemFrom),
        redeemUntil: new Date(parsedBody.redeemUntil),
        maxQuota: parsedBody.isMaxNumber ? parsedBody.maxQuota : null,
        totalGenerated: 0
      }
    })

    return {
      statusCode: 201,
      message: 'Coupon created successfully',
      data: coupon
    }
  } catch (error) {
    console.error('Error creating coupon:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create coupon'
    })
  }
})
