import prisma from "~~/server/utils/prisma"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { slug, email, fullName, customerId } = body

  if (!slug || !email || !customerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: slug, email, or customerId',
    })
  }

  // 1. Upsert Customer
  const customer = await prisma.customer.upsert({
    where: { id: customerId },
    update: {
      email,
      fullName: fullName || undefined,
    },
    create: {
      id: customerId,
      email,
      fullName: fullName || '',
    },
  })

  // 2. Fetch Event
  const eventDetails = await prisma.event.findUnique({
    where: { slug },
    include: {
      group: true
    }
  })

  if (!eventDetails) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Event not found',
    })
  }

  // 3. Check Registration Status
  const registration = await prisma.eventRegistration.findUnique({
    where: {
      customerId_eventId: {
        customerId: customer.id,
        eventId: eventDetails.id,
      },
    },
  })

  const now = new Date()
  const isStarted = eventDetails.startAt ? now >= new Date(eventDetails.startAt) : true
  const isEnded = eventDetails.endAt ? now > new Date(eventDetails.endAt) : false
  const isActive = eventDetails.isActive && isStarted && !isEnded

  return {
    customer,
    event: eventDetails,
    registrationStatus: {
      isRegistered: !!registration,
      isStarted,
      isEnded,
      isActive,
    },
  }
})
