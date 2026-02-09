import prisma from "~~/server/utils/prisma"

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event ID is required',
    })
  }

  const steps = await prisma.registrationStep.findMany({
    where: {
      eventId,
      deletedAt: null
    },
    orderBy: {
      orderPriority: 'asc'
    },
    include: {
      questions: {
        where: { deletedAt: null },
        orderBy: { orderPriority: 'asc' }
      },
      seatConfigs: {
        where: { deletedAt: null }
      }
    }
  })

  return steps
})
