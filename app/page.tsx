"use client"

import { useState, useEffect, useRef } from "react"
import { initialUsers } from "@/data/users"
import { analyzeUser } from "@/lib/analyzer"
import { selectStrategy } from "@/lib/strategy"
import { decideAction } from "@/lib/decision"
import { simulateOutcome } from "@/lib/simulator"
import { User } from "@/types/user"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

type Snapshot = {
  day: number
  activated: number
  baseline: number
  revenue: number
  email: number
  tooltip: number
  incentive: number
}

type LogItem = {
  day: number
  user: string
  action: string
  outcome: string
  reason: string
}

export default function Home() {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [day, setDay] = useState(0)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [logs, setLogs] = useState<LogItem[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState("idle")

  const [budget, setBudget] = useState(200)
  const [spent, setSpent] = useState(0)

  const [narrative, setNarrative] = useState("")

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const VALUE = {
    reengaged: 10,
    converted: 50
  }

  const COST = {
    email: 1,
    tooltip: 0,
    incentive: 20
  }

  const run = () => {
    if (spent > budget) {
      setStatus("paused (budget exceeded)")
      return
    }

    setStatus("thinking")

    setTimeout(() => {
      setStatus("acting")

      let revenue = 0

      let actionMix = {
        email: 0,
        tooltip: 0,
        incentive: 0
      }

      let localSpent = 0

      const updated = users.map(user => {
        const analysis = analyzeUser(user, day)

        const strategy = selectStrategy(user, analysis)

        const decision = decideAction(
          user,
          analysis,
          strategy
        )

        const outcome = simulateOutcome(
          decision.selected
        )

        localSpent +=
          COST[
            decision.selected as keyof typeof COST
          ]

        if (outcome === "reengaged")
          revenue += VALUE.reengaged

        if (outcome === "converted")
          revenue += VALUE.converted

        actionMix[
          decision.selected as keyof typeof actionMix
        ]++

        const stat =
          user.memory.stats[
            decision.selected
          ]

        const successRate =
          stat.attempts > 0
            ? Math.round(
                (stat.successes /
                  stat.attempts) *
                  100
              )
            : 0

        const reason =
          successRate > 40
            ? "performing well"
            : "exploring alternative"

        setLogs(prev => [
          {
            day,
            user: user.name,
            action: decision.selected,
            outcome,
            reason
          },
          ...prev.slice(0, 40)
        ])

        let updatedUser = { ...user }

        if (outcome === "reengaged") {
          updatedUser.lastActiveDay = day
          updatedUser.sessionCount += 1
        }

        if (outcome === "converted") {
          updatedUser.lastActiveDay = day
          updatedUser.sessionCount += 2
          updatedUser.hasCreatedReport = true
        }

        return {
          ...updatedUser,
          memory: {
            pastActions: [
              ...user.memory.pastActions,
              decision.selected
            ],

            stats: {
              ...user.memory.stats,

              [decision.selected]: {
                attempts: stat.attempts + 1,

                successes:
                  stat.successes +
                  (outcome === "converted" ||
                  outcome === "reengaged"
                    ? 1
                    : 0)
              }
            }
          }
        }
      })

      setUsers(updated)

      setSpent(prev => prev + localSpent)

      const activated = updated.filter(
        u => u.hasCreatedReport
      ).length

      const baseline = updated.filter(
        () => Math.random() > 0.7
      ).length

      setHistory(prev => [
        ...prev,
        {
          day,
          activated,
          baseline,
          revenue,
          ...actionMix
        }
      ])

      const dominant =
        actionMix.incentive >
        actionMix.email
          ? "incentives"
          : actionMix.email >
            actionMix.tooltip
          ? "email"
          : "tooltips"

      setNarrative(
        `Agent prioritizing ${dominant} as higher-performing intervention while managing budget efficiency.`
      )

      setStatus("learning")

      setTimeout(() => {
        setStatus("idle")
      }, 300)
    }, 300)
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setDay(d => d + 1)
        run()
      }, 1200)
    } else {
      if (intervalRef.current)
        clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current)
        clearInterval(intervalRef.current)
    }
  }, [running, users])

  const latest = history[history.length - 1]

  const lift = latest
    ? Math.round(
        ((latest.activated -
          latest.baseline) /
          (latest.baseline || 1)) *
          100
      )
    : 0

  const lowRisk = users.filter(
    u => analyzeUser(u, day).riskLevel === "low"
  ).length

  const mediumRisk = users.filter(
    u =>
      analyzeUser(u, day).riskLevel ===
      "medium"
  ).length

  const highRisk = users.filter(
    u => analyzeUser(u, day).riskLevel === "high"
  ).length

  return (
    <div className="min-h-screen bg-black text-white p-8 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between">

        <div>
          <h1 className="text-2xl font-semibold">
            Retention Control Room
          </h1>

          <div className="text-xs text-gray-400 mt-1 max-w-xl">
            {narrative}
          </div>
        </div>

        <div className="flex gap-4 items-center text-sm">

          <div>
            Day {day}
          </div>

          <div>
            Status:
            <span className="text-green-400 ml-1">
              {status}
            </span>
          </div>

          <div>
            Budget:
            <span className="ml-1">
              ${spent} / ${budget}
            </span>
          </div>

          {!running ? (
            <button
              onClick={() => setRunning(true)}
              className="bg-green-600 hover:bg-green-500 transition px-4 py-2 rounded"
            >
              Start
            </button>
          ) : (
            <button
              onClick={() => setRunning(false)}
              className="bg-red-600 hover:bg-red-500 transition px-4 py-2 rounded"
            >
              Stop
            </button>
          )}
        </div>

      </div>

      {/* EXECUTIVE METRICS */}
      <div className="grid grid-cols-4 gap-4">

        <div className="bg-gray-900 rounded p-4 border border-gray-800">
          <div className="text-xs text-gray-500">
            Revenue Impact
          </div>

          <div className="text-2xl font-semibold mt-1">
            ${latest?.revenue || 0}
          </div>
        </div>

        <div className="bg-gray-900 rounded p-4 border border-gray-800">
          <div className="text-xs text-gray-500">
            Activated Users
          </div>

          <div className="text-2xl font-semibold mt-1">
            {latest?.activated || 0}
          </div>
        </div>

        <div className="bg-gray-900 rounded p-4 border border-gray-800">
          <div className="text-xs text-gray-500">
            Lift vs Baseline
          </div>

          <div className="text-2xl font-semibold mt-1 text-green-400">
            {lift}%
          </div>
        </div>

        <div className="bg-gray-900 rounded p-4 border border-gray-800">
          <div className="text-xs text-gray-500">
            Baseline Activation
          </div>

          <div className="text-2xl font-semibold mt-1">
            {latest?.baseline || 0}
          </div>
        </div>

      </div>

      {/* RISK DISTRIBUTION */}
      <div className="grid grid-cols-3 gap-4">

        <div className="bg-gray-900 p-4 rounded border border-green-500/20">
          <div className="text-xs text-gray-500">
            Low Risk Users
          </div>

          <div className="text-3xl font-semibold text-green-400 mt-2">
            {lowRisk}
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Stable engagement patterns
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded border border-yellow-500/20">
          <div className="text-xs text-gray-500">
            Medium Risk Users
          </div>

          <div className="text-3xl font-semibold text-yellow-400 mt-2">
            {mediumRisk}
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Engagement beginning to decline
          </div>
        </div>

        <div className="bg-gray-900 p-4 rounded border border-red-500/20">
          <div className="text-xs text-gray-500">
            High Risk Users
          </div>

          <div className="text-3xl font-semibold text-red-400 mt-2">
            {highRisk}
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Immediate intervention required
          </div>
        </div>

      </div>

      {/* PERFORMANCE CHART */}
      <div className="bg-gray-900 rounded p-4 border border-gray-800">

        <div className="text-sm text-gray-400 mb-4">
          Activation vs Baseline
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={history}>

            <XAxis
              dataKey="day"
              stroke="#666"
            />

            <YAxis
              stroke="#666"
            />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="activated"
              stroke="#22c55e"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#666"
              strokeWidth={2}
              dot={false}
            />

          </LineChart>
        </ResponsiveContainer>

      </div>

      {/* STRATEGY MIX */}
      <div className="bg-gray-900 rounded p-4 border border-gray-800">

        <div className="text-sm text-gray-400 mb-4">
          Strategy Mix
        </div>

        <div className="grid grid-cols-3 gap-4">

          <div className="bg-black rounded p-4">
            <div className="text-xs text-gray-500">
              Email
            </div>

            <div className="text-2xl mt-2">
              {latest?.email || 0}
            </div>
          </div>

          <div className="bg-black rounded p-4">
            <div className="text-xs text-gray-500">
              Tooltip
            </div>

            <div className="text-2xl mt-2">
              {latest?.tooltip || 0}
            </div>
          </div>

          <div className="bg-black rounded p-4">
            <div className="text-xs text-gray-500">
              Incentive
            </div>

            <div className="text-2xl mt-2">
              {latest?.incentive || 0}
            </div>
          </div>

        </div>

      </div>

      {/* LIVE FEED */}
      <div className="bg-gray-900 rounded p-4 border border-gray-800">

        <div className="text-sm text-gray-400 mb-4">
          Live Decision Feed
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">

          {logs.map((log, i) => (
            <div
              key={i}
              className="bg-black rounded p-3 flex justify-between text-sm"
            >

              <div>
                <span className="text-gray-500">
                  Day {log.day}
                </span>

                <span className="ml-3 font-medium">
                  {log.user}
                </span>
              </div>

              <div className="flex gap-4">

                <span className="text-blue-400">
                  {log.action}
                </span>

                <span className="text-green-400">
                  {log.outcome}
                </span>

                <span className="text-gray-500">
                  {log.reason}
                </span>

              </div>

            </div>
          ))}

        </div>

      </div>

    </div>
  )
}