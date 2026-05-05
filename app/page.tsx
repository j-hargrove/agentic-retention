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

  const VALUE = { reengaged: 10, converted: 50 }
  const COST = { email: 1, tooltip: 0, incentive: 20 }

  const run = () => {
    if (spent > budget) {
      setStatus("paused (budget exceeded)")
      return
    }

    setStatus("thinking")

    setTimeout(() => {
      setStatus("acting")

      let revenue = 0
      let actionMix = { email: 0, tooltip: 0, incentive: 0 }
      let localSpent = 0

      const updated = users.map(user => {
        const analysis = analyzeUser(user, day)
        const strategy = selectStrategy(user, analysis)
        const decision = decideAction(user, analysis, strategy)

        const outcome = simulateOutcome(decision.selected)

        // --- COST ---
        localSpent += COST[decision.selected as keyof typeof COST]

        // --- VALUE ---
        if (outcome === "reengaged") revenue += VALUE.reengaged
        if (outcome === "converted") revenue += VALUE.converted

        // --- MIX ---
        actionMix[decision.selected as keyof typeof actionMix]++

        // --- EXPLANATION ---
        const stat = user.memory.stats[decision.selected]
        const successRate =
          stat.attempts > 0
            ? Math.round((stat.successes / stat.attempts) * 100)
            : 0

        const reason =
          successRate > 40
            ? "performing well"
            : "exploring alternative"

        // --- LOG ---
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
            pastActions: [...user.memory.pastActions, decision.selected],
            stats: {
              ...user.memory.stats,
              [decision.selected]: {
                attempts: stat.attempts + 1,
                successes:
                  stat.successes +
                  (outcome === "converted" || outcome === "reengaged"
                    ? 1
                    : 0)
              }
            }
          }
        }
      })

      setUsers(updated)
      setSpent(prev => prev + localSpent)

      const activated = updated.filter(u => u.hasCreatedReport).length
      const baseline = updated.filter(() => Math.random() > 0.7).length

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

      // --- NARRATIVE ---
      const dominant =
        actionMix.incentive > actionMix.email
          ? "incentives"
          : actionMix.email > actionMix.tooltip
          ? "email"
          : "tooltips"

      setNarrative(
        `Agent prioritizing ${dominant} as higher-performing intervention while managing budget efficiency.`
      )

      setStatus("learning")
      setTimeout(() => setStatus("idle"), 300)
    }, 300)
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setDay(d => d + 1)
        run()
      }, 1200)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, users])

  const latest = history[history.length - 1]
  const lift = latest
    ? Math.round(((latest.activated - latest.baseline) / (latest.baseline || 1)) * 100)
    : 0

  return (
    <div className="min-h-screen bg-black text-white p-8 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl">Retention Control Room</h1>
          <div className="text-xs text-gray-400">{narrative}</div>
        </div>

        <div className="flex gap-4 items-center text-sm">
          <div>Day {day}</div>
          <div>Status: <span className="text-green-400">{status}</span></div>
          <div>Budget: ${spent} / ${budget}</div>

          {!running ? (
            <button onClick={() => setRunning(true)} className="bg-green-600 px-3 py-1 rounded">Start</button>
          ) : (
            <button onClick={() => setRunning(false)} className="bg-red-600 px-3 py-1 rounded">Stop</button>
          )}
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div className="bg-gray-900 p-3 rounded">Revenue: ${latest?.revenue || 0}</div>
        <div className="bg-gray-900 p-3 rounded">Activated: {latest?.activated || 0}</div>
        <div className="bg-gray-900 p-3 rounded">Lift: {lift}%</div>
        <div className="bg-gray-900 p-3 rounded">Baseline: {latest?.baseline || 0}</div>
      </div>

      {/* CHART */}
      <div className="bg-gray-900 p-4 rounded">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={history}>
            <XAxis dataKey="day" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Line dataKey="activated" stroke="#52c41a" />
            <Line dataKey="baseline" stroke="#555" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* STRATEGY MIX */}
      <div className="bg-gray-900 p-4 rounded text-xs">
        Strategy Mix (latest):
        <div>Email: {latest?.email || 0}</div>
        <div>Tooltip: {latest?.tooltip || 0}</div>
        <div>Incentive: {latest?.incentive || 0}</div>
      </div>

      {/* LOG */}
      <div className="bg-gray-900 p-4 rounded text-xs max-h-64 overflow-y-auto space-y-2">
        {logs.map((l, i) => (
          <div key={i} className="flex justify-between bg-black p-2 rounded">
            <div>Day {l.day} — {l.user}</div>
            <div className="flex gap-3">
              <span>{l.action}</span>
              <span>{l.outcome}</span>
              <span className="text-gray-400">{l.reason}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}