import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        title: true,
        slug: true,
        startAt: true,
        endAt: true
      },
      orderBy: {
        startAt: 'asc'
      }
    })

    return {
      data: events
    }
  } catch (error) {
    console.error('Error fetching events:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch events'
    })
  }
})
