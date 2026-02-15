import { z } from 'zod'
import { isValid, isAfter, isBefore, isEqual } from 'date-fns'

export const couponFieldSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Uppercase letters, numbers, hyphens, and underscores only'),
  description: z.string().optional().default(''),
  allowGenerateFrom: z.coerce.date(),
  allowGenerateUntil: z.coerce.date(),
  redeemFrom: z.coerce.date(),
  redeemUntil: z.coerce.date(),
  isMaxNumber: z.boolean().default(false),
  maxQuota: z.number().nullable().optional(),
  eventId: z.string().uuid()
})

const refineDateRange = (
  schema: z.ZodType<any>,
  startField: string,
  endField: string,
  errorPath: string,
  message: string
) => {
  return schema.refine(
    (data) => {
      const start = data[startField]
      const end = data[endField]
      if (!isValid(start) || !isValid(end)) return true 
      return isAfter(end, start)
    },
    {
      message,
      path: [errorPath]
    }
  )
}

export const couponFormSchema = couponFieldSchema
  .superRefine((data, ctx) => {
    // Generate Period Validation
    if (isValid(data.allowGenerateFrom) && isValid(data.allowGenerateUntil)) {
      if (!isAfter(data.allowGenerateUntil, data.allowGenerateFrom)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Must be after generation start',
          path: ['allowGenerateUntil']
        })
      }
    }

    // Redeem Period Validation
    if (isValid(data.redeemFrom) && isValid(data.redeemUntil)) {
       if (!isAfter(data.redeemUntil, data.redeemFrom)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Must be after redemption start',
          path: ['redeemUntil']
        })
      }
    }

    // Cross-Period Validation: Redeem Start >= Generate Start
    if (isValid(data.redeemFrom) && isValid(data.allowGenerateFrom)) {
      if (isBefore(data.redeemFrom, data.allowGenerateFrom)) {
         ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Must be on or after generation start',
          path: ['redeemFrom']
        })
      }
    }

    // Max Quota Validation
    if (data.isMaxNumber) {
      if (!data.maxQuota || data.maxQuota < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Max Quota must be at least 1',
          path: ['maxQuota']
        })
      }
    }
  })

export type CouponFormValues = z.infer<typeof couponFormSchema>
