import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = query.search as string
  const eventId = query.eventId as string
  const allowGenerateFrom = query.allowGenerateFrom as string
  const allowGenerateUntil = query.allowGenerateUntil as string
  const redeemFrom = query.redeemFrom as string
  const redeemUntil = query.redeemUntil as string

  try {
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (eventId && eventId !== '-') {
      where.eventId = eventId
    }

    if (allowGenerateFrom || allowGenerateUntil) {
      if (allowGenerateFrom) {
        where.allowGenerateFrom = { gte: new Date(allowGenerateFrom) }
      }
      if (allowGenerateUntil) {
        where.allowGenerateUntil = { lte: new Date(allowGenerateUntil) }
      }
    }

    if (redeemFrom || redeemUntil) {
      if (redeemFrom) {
        where.redeemFrom = { gte: new Date(redeemFrom) }
      }
      if (redeemUntil) {
        where.redeemUntil = { lte: new Date(redeemUntil) }
      }
    }

    const coupons = await prisma.eventCoupon.findMany({
      where,
      include: {
        event: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return {
      data: coupons
    }
  } catch (error) {
    console.error('Error fetching coupons:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch coupons'
    })
  }
})
