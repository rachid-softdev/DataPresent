export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    reportsPerMonth: 3,
    maxSlides: 8,
    formats: ["PPTX"] as const,
    collaboration: false,
    watermark: true,
    stripePriceId: null,
  },
  PRO: {
    name: "Pro",
    price: 19,
    reportsPerMonth: 30,
    maxSlides: 20,
    formats: ["PPTX", "PDF", "DOCX"] as const,
    collaboration: false,
    watermark: false,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
  TEAM: {
    name: "Team",
    price: 49,
    reportsPerMonth: -1,
    maxSlides: 30,
    formats: ["PPTX", "PDF", "DOCX"] as const,
    collaboration: true,
    watermark: false,
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID!,
  },
} as const

export type PlanType = keyof typeof PLANS