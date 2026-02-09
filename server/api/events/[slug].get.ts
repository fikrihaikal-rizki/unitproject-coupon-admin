import prisma from "~~/server/utils/prisma" 

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required',
    })
  }

  const eventDetails = await prisma.event.findUnique({
    where: { slug }
  })

  if (!eventDetails) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Event not found',
    })
  }

  return eventDetails
})
