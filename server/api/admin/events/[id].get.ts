import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event ID is required'
    })
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: id }
    })

    if (!event) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Event not found'
      })
    }

    return {
      data: event
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Error fetching event:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch event'
    })
  }
})
