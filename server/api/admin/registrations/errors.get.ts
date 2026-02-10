import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const search = (query.search as string) || ''
    const status = query.status as string | undefined

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { triedValue: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status && (status === 'open' || status === 'resolved')) {
      where.status = status
    }

    const [errors, total] = await Promise.all([
      prisma.claimSeatError.findMany({
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
          createdAt: 'desc'
        }
      }),
      prisma.claimSeatError.count({ where })
    ])

    return {
      data: errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching claim seat errors:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch claim seat errors'
    })
  }
})
