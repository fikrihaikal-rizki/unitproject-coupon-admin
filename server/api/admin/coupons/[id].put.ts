import { couponFormSchema } from '~~/app/utils/schemas/coupon'
import { isBefore, parseISO } from 'date-fns'
import prisma from '~~/server/utils/prisma'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  // TODO: Add proper admin authorization here if not handled by middleware
  // const session = await requireAdminSession(event)
  
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Coupon ID is required'
    })
  }

  const body = await readBody(event)

  // Validate request body
  let parsedBody
  try {
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

  // Fetch existing coupon to check redeemFrom
  const existingCoupon = await prisma.eventCoupon.findUnique({
    where: { id: parseInt(id) }
  })

  if (!existingCoupon) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Coupon not found'
    })
  }

  // Security check: prevent updates if redemption period has started
  const now = new Date()
  const redeemFrom = new Date(existingCoupon.redeemFrom)
  
  if (!isBefore(now, redeemFrom)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cannot update coupon: Redemption period has already started'
    })
  }

  // Check for duplicate code (exclude current coupon)
  const duplicateCoupon = await prisma.eventCoupon.findFirst({
    where: {
      eventId: parsedBody.eventId,
      code: parsedBody.code,
      NOT: {
        id: parseInt(id)
      }
    }
  })

  if (duplicateCoupon) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Coupon code already exists for this event'
    })
  }

  try {
    const coupon = await prisma.eventCoupon.update({
      where: { id: parseInt(id) },
      data: {
        name: parsedBody.name,
        code: parsedBody.code,
        description: parsedBody.description,
        allowGenerateFrom: new Date(parsedBody.allowGenerateFrom),
        allowGenerateUntil: new Date(parsedBody.allowGenerateUntil),
        redeemFrom: new Date(parsedBody.redeemFrom),
        redeemUntil: new Date(parsedBody.redeemUntil),
        maxQuota: parsedBody.isMaxNumber ? parsedBody.maxQuota : null,
      }
    })

    return {
      statusCode: 200,
      message: 'Coupon updated successfully',
      data: coupon
    }
  } catch (error) {
    console.error('Error updating coupon:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update coupon'
    })
  }
})
