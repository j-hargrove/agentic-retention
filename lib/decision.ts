import { User, ActionType, Strategy } from "@/types/user"
import { AnalysisResult } from "./analyzer"

export type DecisionOption = {
  action: ActionType
  score: number
}

export type DecisionResult = {
  goal: string
  options: DecisionOption[]
  selected: ActionType
  reasoning: string
}

export function decideAction(
  user: User,
  analysis: AnalysisResult,
  strategy: Strategy
): DecisionResult {
  let goal = ""
  let options: DecisionOption[] = []

  if (strategy === "activation") {
    goal = "drive first key action"
    options = [
      { action: "tooltip", score: 0.6 },
      { action: "email", score: 0.3 },
      { action: "incentive", score: 0.2 }
    ]
  }

  if (strategy === "engagement") {
    goal = "increase usage"
    options = [
      { action: "tooltip", score: 0.4 },
      { action: "email", score: 0.5 },
      { action: "incentive", score: 0.2 }
    ]
  }

  if (strategy === "recovery") {
    goal = "re-engage user"
    options = [
      { action: "tooltip", score: 0.2 },
      { action: "email", score: 0.5 },
      { action: "incentive", score: 0.6 }
    ]
  }

  // Signal boost
  if (analysis.signals.includes("inactive_5_plus_days")) {
    options = options.map(o =>
      o.action === "incentive"
        ? { ...o, score: o.score + 0.2 }
        : o
    )
  }

  // Memory influence
  options = options.map(o => {
    const stat = user.memory.stats[o.action]
    const failureRate =
      stat.attempts > 0
        ? 1 - stat.successes / stat.attempts
        : 0

    return {
      ...o,
      score: o.score - failureRate * 0.3
    }
  })

  const selectedOption = options.reduce((best, current) =>
    current.score > best.score ? current : best
  )

  return {
    goal,
    options,
    selected: selectedOption.action,
    reasoning: `Selected ${selectedOption.action} based on signals and past performance.`
  }
}