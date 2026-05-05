export type RiskLevel = "low" | "medium" | "high"

export type Strategy = "activation" | "engagement" | "recovery"

export type ActionType =
  | "none"
  | "tooltip"
  | "email"
  | "incentive"

export type User = {
  id: string
  name: string
  signupDate: number
  lastActiveDay: number
  sessionCount: number
  featuresUsed: string[]
  hasCreatedReport: boolean

  memory: {
    pastActions: ActionType[]
    stats: Record<
      ActionType,
      {
        attempts: number
        successes: number
      }
    >
  }
}