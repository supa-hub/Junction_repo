import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ApiError, api } from '../../api'
import type { LeaderboardEntry, LeaderboardResponse } from '../../api'
import { Button } from '../ui/button'

interface LeaderboardProps {
  sessionId: string
  sessionName: string
  onBack: () => void
}

export function Leaderboard({ sessionId, sessionName, onBack }: LeaderboardProps) {
  const [state, setState] = useState<{ data: LeaderboardResponse | null; loading: boolean; error: string | null }>(
    { data: null, loading: true, error: null },
  )

  useEffect(() => {
    let mounted = true
    const fetchLeaderboard = async () => {
      setState({ data: null, loading: true, error: null })
      try {
        const response = await api.fetchLeaderboard(sessionId)
        if (mounted) setState({ data: response, loading: false, error: null })
      } catch (leaderboardError) {
        const message = leaderboardError instanceof ApiError
          ? leaderboardError.message
          : leaderboardError instanceof Error
            ? leaderboardError.message
            : 'Unable to load leaderboard.'
        if (mounted) setState({ data: null, loading: false, error: message })
      }
    }
    fetchLeaderboard()
    return () => {
      mounted = false
    }
  }, [sessionId])

  const entries = state.data?.entries ?? []

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="border-b border-slate-800 bg-slate-950/50 p-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Button variant="ghost" className="text-white" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Live leaderboard</p>
            <h1 className="text-2xl text-white">{sessionName}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        {state.loading && (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {state.error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/20 p-4 text-sm text-rose-50">
            {state.error}
          </div>
        )}

        {!state.loading && !state.error && (
          <div className="space-y-4">
            {entries.length === 0 && <p className="text-center text-slate-400">No students have played yet.</p>}
            {entries.map((entry) => (
              <LeaderboardRow key={`${entry.rank}-${entry.name}`} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const stats = [
    { label: 'Wealth', value: entry.wealth },
    { label: 'Health', value: entry.health },
    { label: 'Happiness', value: entry.happiness },
  ]

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${entry.rank <= 3 ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-white'}`}>
          #{entry.rank}
        </div>
        <div className="flex-1">
          <p className="text-lg text-white">{entry.name}</p>
          <p className="text-xs text-slate-400">{entry.scenariosDone} scenarios completed</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
              <p className="text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
