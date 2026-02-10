import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    // Total Events
    const totalEvents = await prisma.event.count({
      where: { isActive: true }
    })

    // Total Participants
    const totalParticipants = await prisma.eventRegistration.count()

    // Total Pending Participants
    const totalPendingParticipants = await prisma.eventRegistration.count({
      where: { status: 'pending' }
    })

    // Total Pending Errors
    const totalPendingErrors = await prisma.claimSeatError.count({
      where: { status: 'open' }
    })

    // Registration trends (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const registrationTrends = await prisma.eventRegistration.groupBy({
      by: ['registeredAt'],
      _count: {
        id: true
      },
      where: {
        registeredAt: {
          gte: sevenDaysAgo
        }
      },
      orderBy: {
        registeredAt: 'asc'
      }
    })

    // Format trends data by date
    const trendsMap = new Map<string, number>()
    registrationTrends.forEach((trend) => {
      if (trend.registeredAt) {
        const dateKey = trend.registeredAt.toISOString().split('T')[0]
        if (dateKey) {
          trendsMap.set(dateKey, (trendsMap.get(dateKey) || 0) + trend._count.id)
        }
      }
    })

    // Generate last 7 days data
    const trends = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      if (dateKey) {
        trends.push({
          date: dateKey,
          count: trendsMap.get(dateKey) || 0
        })
      }
    }

    return {
      stats: {
        totalEvents,
        totalParticipants,
        totalPendingParticipants,
        totalPendingErrors
      },
      trends
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch dashboard statistics'
    })
  }
})
