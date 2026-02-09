import prisma from "~~/server/utils/prisma"
import { randomBytes } from'crypto'

import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const body = await readBody(event)
  const { eventId, claimSeatValue, questionnaireAnswers } = body

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event ID is required',
    })
  }

  // 1. Transaction to ensure data consistency
  const result = await prisma.$transaction(async (tx) => {
    // Generate a unique QR code data if not exists (handled by DB default usually, but we do it here if needed)
    // Actually we will upsert, so we need to be careful not to overwrite qrCodeData if it exists

    // Find existing registration first to preserve QR code if it exists
    const existing = await tx.eventRegistration.findUnique({
      where: {
        customerId_eventId: {
          customerId: user.sub,
          eventId: eventId
        }
      }
    })

    const qrCodeData = existing?.qrCodeData || randomBytes(16).toString('hex')

    const registration = await tx.eventRegistration.upsert({
      where: {
        customerId_eventId: {
          customerId: user.sub,
          eventId: eventId
        }
      },
      update: {
        claimSeatValue: claimSeatValue || '',
        status: 'active',
        // Do NOT update qrCodeData
      },
      create: {
        customerId: user.sub,
        eventId: eventId,
        claimSeatValue: claimSeatValue || '',
        qrCodeData: qrCodeData,
        status: 'active'
      }
    })

    // 2. Handle Questionnaire Answers
    if (questionnaireAnswers && Array.isArray(questionnaireAnswers)) {
      // Delete existing answers for this registration
      await tx.questionnaireAnswer.deleteMany({
        where: { registrationId: registration.id }
      })

      if (questionnaireAnswers.length > 0) {
        await tx.questionnaireAnswer.createMany({
          data: questionnaireAnswers.map((ans: any) => ({
            registrationId: registration.id,
            questionId: ans.questionId,
            answerValue: String(ans.answerValue)
          }))
        })
      }
    }

    return registration
  })

  return {
    success: true,
    registration: result
  }
})
