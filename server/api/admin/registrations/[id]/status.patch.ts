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

    const body = await readBody(event)
    const { status } = body

    // Validate status
    const validStatuses = ['active', 'pending', 'completed', 'cancelled'] as const
    if (!status || !validStatuses.includes(status)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid status. Must be one of: active, pending, completed, cancelled'
      })
    }

    // Check if registration exists
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: { id: Number(id) }
    })

    if (!existingRegistration) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Registration not found'
      })
    }

    // Update the status
    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id: Number(id) },
      data: {
        status: status
      },
      select: {
        id: true,
        status: true
      }
    })

    return {
      success: true,
      registration: updatedRegistration
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error updating registration status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update registration status'
    })
  }
})
