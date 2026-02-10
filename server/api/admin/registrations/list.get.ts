import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const search = (query.search as string) || ''
    const status = query.status as string | undefined
    const eventId = query.eventId as string | undefined

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { claimSeatValue: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status && ['active', 'pending', 'completed', 'cancelled'].includes(status)) {
      where.status = status
    }

    if (eventId) {
      where.eventId = eventId
    }

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where,
        skip,
        take: limit,
        include: {
          event: {
            select: {
              title: true,
              slug: true
            }
          },
          customer: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true
            }
          }
        },
        orderBy: {
          registeredAt: 'desc'
        }
      }),
      prisma.eventRegistration.count({ where })
    ])

    return {
      data: registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching registrations:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch registrations'
    })
  }
})
