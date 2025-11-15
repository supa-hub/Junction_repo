import { ArrowLeft, Download, TrendingDown, TrendingUp } from 'lucide-react'
import type { AnalyticsSummary } from '../../api'
import { Button } from '../ui/button'

export interface ClassroomSimulationSummaryProps {
  classroomName: string
  sessionId: string
  analytics: AnalyticsSummary
  onBack: () => void
}

export function ClassroomSimulationSummary({ classroomName, analytics, onBack }: ClassroomSimulationSummaryProps) {
  const { classroomSummary, statDistributions, habitAverages, leaderboardHighlights, recommendations } = analytics

  const stats = ['wealth', 'happiness'] as const

  const handleExport = () => {
    alert('PDF export will be wired to /reports endpoint in a later iteration.')
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-white" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Button>
          <Button variant="outline" className="border-slate-700 text-white" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export snapshot
          </Button>
        </div>

        <section className="rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-900 to-purple-900 p-6 text-white">
          <p className="text-sm uppercase tracking-wide text-blue-200">Analytics summary</p>
          <h1 className="text-3xl font-semibold">{classroomName}</h1>
          <p className="text-blue-100">{classroomSummary.students} students • {Math.round(classroomSummary.engagementRate * 100)}% engagement • {classroomSummary.avgScenariosCompleted.toFixed(1)} avg core scenarios</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {stats.map((stat) => {
            const distribution = statDistributions[stat]
            return (
              <div key={stat} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat}</p>
                <p className="text-3xl text-white">Median {distribution?.median ?? 0}</p>
                <p className="text-sm text-slate-400">Range {distribution?.min ?? 0} – {distribution?.max ?? 0} • P90 {distribution?.p90 ?? 0}</p>
              </div>
            )
          })}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl text-white">Habit averages</h2>
            <p className="text-sm text-slate-400">Signals driving long-term effects.</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(habitAverages).map(([habit, value]) => (
              <HabitCard key={habit} habit={habit} mean={value.mean} trend={value.trend} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl text-white">Leaderboard highlights</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {leaderboardHighlights.map((highlight) => (
              <div key={highlight.studentId} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">{highlight.stat}</p>
                <p className="text-2xl text-white">{highlight.nickname}</p>
                <p className="text-xs text-slate-500">Score {highlight.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl text-white">Recommendations</h2>
          <ul className="mt-4 space-y-3">
            {recommendations.map((recommendation) => (
              <li key={recommendation.curriculumRef} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-slate-100">{recommendation.summary}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{recommendation.curriculumRef}</p>
                <p className="text-sm text-slate-400">{recommendation.rationale}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function HabitCard({ habit, mean, trend }: { habit: string; mean: number; trend: string }) {
  const positive = trend === 'rising' || trend === 'stable'
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{habit}</p>
      <p className="text-3xl text-white">{mean.toFixed(1)}</p>
      <div className={`mt-1 flex items-center gap-2 text-sm ${positive ? 'text-green-300' : 'text-rose-300'}`}>
        <Icon className="h-4 w-4" />
        {trend}
      </div>
    </div>
  )
}
