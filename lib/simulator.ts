import { ActionType } from "@/types/user"

export type Outcome = "no_change" | "reengaged" | "converted"

export function simulateOutcome(action: ActionType): Outcome {
  const rand = Math.random()

  // --- Simple probabilities ---
  if (action === "tooltip") {
    if (rand > 0.7) return "reengaged"
    return "no_change"
  }

  if (action === "email") {
    if (rand > 0.6) return "reengaged"
    return "no_change"
  }

  if (action === "incentive") {
    if (rand > 0.5) return "converted"
    return "reengaged"
  }

  return "no_change"
}