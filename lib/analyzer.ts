import { User, RiskLevel } from "@/types/user"

export type AnalysisResult = {
  riskLevel: RiskLevel
  riskScore: number
  signals: string[]
}

export function analyzeUser(user: User, currentDay: number): AnalysisResult {
  const signals: string[] = []

  const daysInactive = currentDay - user.lastActiveDay
  const lowSessions = user.sessionCount < 3

  let score = 0

  if (daysInactive >= 5) {
    signals.push("inactive_5_plus_days")
    score += 40
  } else if (daysInactive >= 3) {
    signals.push("inactive_3_plus_days")
    score += 25
  }

  if (!user.hasCreatedReport) {
    signals.push("not_activated")
    score += 30
  }

  if (lowSessions) {
    signals.push("low_session_count")
    score += 15
  }

  if (score > 100) score = 100

  let riskLevel: RiskLevel = "low"
  if (score >= 60) riskLevel = "high"
  else if (score >= 30) riskLevel = "medium"

  return { riskLevel, riskScore: score, signals }
}