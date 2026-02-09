export default defineEventHandler(async (event) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        startAt: 'desc',
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        bannerPath: true,
        startAt: true,
        endAt: true,
        successGreeting: true,
        successDescription: true,
        successPrimaryBtnText: true,
        successPrimaryBtnUrl: true,
      },
    })

    return events
  } catch (error: any) {
    console.error('Error fetching event list:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch event list',
    })
  }
})
