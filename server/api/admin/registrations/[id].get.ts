import prisma from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Registration ID is required'
      })
    }

    const registration = await prisma.eventRegistration.findUnique({
      where: { id: Number(id) },
      include: {
        event: {
          select: {
            title: true,
            slug: true,
            description: true
          }
        },
        customer: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true
          }
        },
        answers: {
          include: {
            question: {
              select: {
                label: true,
                inputType: true
              }
            }
          }
        }
      }
    })

    if (!registration) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Registration not found'
      })
    }

    return registration
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error fetching registration detail:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch registration detail'
    })
  }
})
