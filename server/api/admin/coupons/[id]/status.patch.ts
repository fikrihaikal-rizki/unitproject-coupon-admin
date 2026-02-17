import { z } from 'zod'
import prisma from '~~/server/utils/prisma'

const statusUpdateSchema = z.object({
  active: z.boolean()
})

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  
  if (!idParam) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Coupon ID is required'
    })
  }

  const id = parseInt(idParam, 10)
  
  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Coupon ID'
    })
  }

  try {
    // Parse and validate request body
    const body = await readBody(event)
    const validatedData = statusUpdateSchema.parse(body)

    // Fetch the coupon to check time window
    const coupon = await prisma.eventCoupon.findUnique({
      where: { id },
      select: {
        id: true,
        allowGenerateFrom: true,
        redeemUntil: true,
        isActive: true
      }
    })

    if (!coupon) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Coupon not found'
      })
    }

    // Server-side time window validation
    const now = new Date()
    const allowGenerateFrom = new Date(coupon.allowGenerateFrom)
    const redeemUntil = new Date(coupon.redeemUntil)

    const isWithinTimeWindow = now >= allowGenerateFrom && now < redeemUntil

    if (!isWithinTimeWindow) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Delete/Restore actions are only available during the active event cycle (from generation start until redemption ends)'
      })
    }

    // Update the coupon status
    const updatedCoupon = await prisma.eventCoupon.update({
      where: { id },
      data: {
        isActive: validatedData.active
      },
      include: {
        event: {
          select: {
            title: true
          }
        }
      }
    })

    return {
      success: true,
      data: updatedCoupon
    }
  } catch (error: any) {
    console.error('Error updating coupon status:', error)
    
    if (error.statusCode) {
      throw error
    }

    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: error.issues
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update coupon status'
    })
  }
})
