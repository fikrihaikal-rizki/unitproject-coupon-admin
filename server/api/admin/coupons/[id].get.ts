import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Coupon ID is required'
    })
  }

  try {
    const coupon = await prisma.eventCoupon.findUnique({
      where: { id: parseInt(id) },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true
          }
        }
      }
    })

    if (!coupon) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Coupon not found'
      })
    }

    return {
      data: coupon
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Error fetching coupon:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch coupon'
    })
  }
})
