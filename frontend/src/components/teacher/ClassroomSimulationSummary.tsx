import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'

import { Button } from '../ui/button'

interface ScenarioInsight {
  id: string
  title: string
  scenario: string
  commonMistakes: string[]
  strongPerformance: string[]
  avgWealthImpact: number
  avgHealthImpact: number
  avgHappinessImpact: number
  studentCount: number
}

export interface ClassroomSimulationSummaryProps {
  classroomName: string
  studentCount: number
  completionDate: Date
  classAverage: {
    wealth: number
    health: number
    happiness: number
  }
  overallStrengths: string[]
  overallWeaknesses: string[]
  teachingRecommendations: string[]
  scenarioInsights: ScenarioInsight[]
  onBack: () => void
}

export function ClassroomSimulationSummary(props: ClassroomSimulationSummaryProps) {
  const {
    classroomName,
    studentCount,
    completionDate,
    classAverage,
    overallStrengths,
    overallWeaknesses,
    teachingRecommendations,
    scenarioInsights,
    onBack,
  } = props

  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)

  const handleExport = () => {
    // Placeholder for future export hook
    alert('Export functionality would download a PDF report here')
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" className="text-white hover:bg-slate-800">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Dashboard
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        <div className="rounded-xl border border-purple-700 bg-gradient-to-r from-purple-900 to-blue-900 p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-3xl text-white">Simulation Summary</h1>
              <p className="text-lg text-purple-200">{classroomName}</p>
              <p className="mt-1 text-sm text-purple-300">
                Completed {completionDate.toLocaleDateString()} • {studentCount} students participated
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-green-500 bg-green-500/20 px-4 py-2 text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Complete
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="mb-1 text-sm text-slate-400">Class Avg. Wealth</div>
              <div className="text-2xl text-green-400">${classAverage.wealth.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="mb-1 text-sm text-slate-400">Class Avg. Health</div>
              <div className="text-2xl text-blue-400">{classAverage.health}%</div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <div className="mb-1 text-sm text-slate-400">Class Avg. Happiness</div>
              <div className="text-2xl text-purple-400">{classAverage.happiness}%</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <h2 className="text-xl text-white">Class Strengths</h2>
            </div>
            <ul className="space-y-3 text-slate-300">
              {overallStrengths.map((strength) => (
                <li key={strength} className="flex gap-3">
                  <span className="text-green-400">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <h2 className="text-xl text-white">Areas for Improvement</h2>
            </div>
            <ul className="space-y-3 text-slate-300">
              {overallWeaknesses.map((weakness) => (
                <li key={weakness} className="flex gap-3">
                  <span className="text-orange-400">!</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
              <Lightbulb className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl text-white">Teaching Recommendations</h2>
          </div>
          <div className="space-y-4">
            {teachingRecommendations.map((recommendation, index) => (
              <div key={recommendation} className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-sm text-blue-400">
                  {index + 1}
                </div>
                <p className="flex-1 text-slate-300">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
              <Target className="h-6 w-6 text-purple-400" />
            </div>
            <h2 className="text-xl text-white">Scenario Analysis</h2>
          </div>
          <div className="space-y-4">
            {scenarioInsights.map((scenario) => (
              <div key={scenario.id} className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setExpandedScenario(expandedScenario === scenario.id ? null : scenario.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-800/50"
                >
                  <div>
                    <h3 className="text-white">{scenario.title}</h3>
                    <p className="text-sm text-slate-400">{scenario.scenario}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      {scenario.studentCount} students
                    </div>
                    <span>{expandedScenario === scenario.id ? '−' : '+'}</span>
                  </div>
                </button>
                {expandedScenario === scenario.id && (
                  <div className="border-t border-slate-700">
                    <div className="flex flex-wrap items-center gap-6 border-b border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
                      <span>Class Average Impact:</span>
                      <ImpactChip label="Wealth" value={scenario.avgWealthImpact} prefix="$" />
                      <ImpactChip label="Health" value={scenario.avgHealthImpact} suffix="%" />
                      <ImpactChip label="Happiness" value={scenario.avgHappinessImpact} suffix="%" />
                    </div>
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      {scenario.commonMistakes.length > 0 && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-2 text-sm text-orange-400">
                            <AlertTriangle className="h-4 w-4" />
                            Common Mistakes
                          </h4>
                          <ul className="space-y-2 text-sm text-slate-300">
                            {scenario.commonMistakes.map((mistake) => (
                              <li key={mistake} className="flex gap-2">
                                <span className="text-orange-400">•</span>
                                <span>{mistake}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {scenario.strongPerformance.length > 0 && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-2 text-sm text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Strong Performance
                          </h4>
                          <ul className="space-y-2 text-sm text-slate-300">
                            {scenario.strongPerformance.map((performance) => (
                              <li key={performance} className="flex gap-2">
                                <span className="text-green-400">•</span>
                                <span>{performance}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
          >
            <BookOpen className="mr-2 h-5 w-5" />
            Return to Dashboard
          </Button>
          <Button onClick={handleExport} size="lg" className="bg-purple-600 hover:bg-purple-700">
            <Download className="mr-2 h-5 w-5" />
            Export Full Report
          </Button>
        </div>
      </div>
    </div>
  )
}

function ImpactChip({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string
  value: number
  prefix?: string
  suffix?: string
}) {
  const positive = value >= 0
  const icon = positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  return (
    <div className={`flex items-center gap-2 text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
      <span className="text-slate-400">{label}</span>
      {icon}
      {positive ? '+' : ''}
      {prefix}
      {Math.abs(value)}
      {suffix}
    </div>
  )
}
