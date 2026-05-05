import { User, Strategy } from "@/types/user"
import { AnalysisResult } from "./analyzer"

export function selectStrategy(
  user: User,
  analysis: AnalysisResult
): Strategy {
  if (!user.hasCreatedReport) return "activation"
  if (analysis.riskLevel === "high") return "recovery"
  return "engagement"
}