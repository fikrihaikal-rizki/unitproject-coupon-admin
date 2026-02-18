import prisma from '~~/server/utils/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export default defineEventHandler(async (event) => {
  try {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    // Visibility Rules for Operator:
    // 1. VISIBLE if now is within redeem interval (active)
    // 2. VISIBLE if redeemFrom is today (preparation/upcoming)
    // Basically: redeemUntil MUST be >= todayStart AND redeemFrom MUST be <= todayEnd
    
    const coupons = await prisma.eventCoupon.findMany({
      where: {
        isActive: true, // Only published coupons
        redeemUntil: {
          gte: todayStart,
        },
        redeemFrom: {
          lte: todayEnd,
        },
      },
      include: {
        event: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        redeemFrom: 'asc',
      },
    })

    return {
      success: true,
      data: coupons,
    }
  } catch (error) {
    console.error('Error fetching operator coupons:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch coupons',
    })
  }
})
