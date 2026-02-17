import prisma from '~~/server/utils/prisma'
import { isAfter, isBefore } from 'date-fns'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { qrData, checkOnly } = body

  if (!qrData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'QR Data is required',
    })
  }

  // Get admin info from context (added by middleware)
  const adminContext = event.context.admin as { adminId: number; email: string }
  if (!adminContext) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  // 1. Fetch Admin and verify role
  const admin = await prisma.administrator.findUnique({
    where: { id: adminContext.adminId }
  })

  if (!admin || ((admin as any).role !== 'admin' && (admin as any).role !== 'operator')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Insufficient permissions',
    })
  }

  // 2. Find Customer Coupon
  const coupon = await prisma.customerCoupon.findUnique({
    where: { qrData },
    include: {
      eventCoupon: {
        include: {
          event: true
        }
      },
      registration: {
        include: {
          customer: true
        }
      }
    }
  })

  if (!coupon) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Coupon not found',
    })
  }

  // Support for Dry Run (Check Only)
  if (checkOnly) {
    const redeemedBy = coupon.scannedById ? await prisma.administrator.findUnique({ where: { id: coupon.scannedById } }) : null
    return {
      success: true,
      checkOnly: true,
      isRedeemed: coupon.isRedeemed,
      redeemedAt: coupon.redeemedAt,
      redeemedBy: redeemedBy?.fullname,
      couponId: coupon.eventCoupon.id,
      couponName: coupon.eventCoupon.name,
      redeemUntil: coupon.eventCoupon.redeemUntil,
      customerName: coupon.registration.customer?.fullName || 'Anonymous'
    }
  }

  // 3. Check if already redeemed
  if (coupon.isRedeemed) {
     const redeemedBy = coupon.scannedById ? await prisma.administrator.findUnique({ where: { id: coupon.scannedById } }) : null
     return {
      success: false,
      alreadyRedeemed: true,
      redeemedAt: coupon.redeemedAt,
      redeemedBy: redeemedBy?.fullname,
      message: 'Warning: Coupon Already Redeemed!'
    }
  }

  // 4. Validate Expiry
  const now = new Date()
  const redeemFrom = coupon.eventCoupon.redeemFrom
  const redeemUntil = coupon.eventCoupon.redeemUntil

  if (isBefore(now, redeemFrom)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Coupon redemption has not started yet. It will start on ${redeemFrom.toISOString()}`,
    })
  }

  if (isAfter(now, redeemUntil)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Coupon Expired! This coupon reached its deadline on ${redeemUntil.toISOString()}`,
    })
  }

  // 5. Perform Redemption
  const updatedCoupon = await prisma.customerCoupon.update({
    where: { id: coupon.id },
    data: {
      isRedeemed: true,
      redeemedAt: now,
      scannedById: admin.id
    },
    include: {
      eventCoupon: true,
      registration: {
        include: {
          customer: true
        }
      }
    }
  })

  return {
    success: true,
    data: {
      couponName: updatedCoupon.eventCoupon.name,
      customerName: updatedCoupon.registration.customer?.fullName || 'Anonymous',
      email: updatedCoupon.registration.customer?.email,
      phoneNumber: updatedCoupon.registration.customer?.phoneNumber,
      claimSeatValue: updatedCoupon.registration.claimSeatValue,
      redeemedAt: updatedCoupon.redeemedAt,
      redeemUntil: updatedCoupon.eventCoupon.redeemUntil // included for UI logic if needed
    }
  }
})
