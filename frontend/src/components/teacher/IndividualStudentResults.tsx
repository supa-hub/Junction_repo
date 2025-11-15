import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingDown,
  TrendingUp,
  User,
} from 'lucide-react'

import { Button } from '../ui/button'

interface ScenarioResult {
  id: string
  title: string
  scenario: string
  studentResponse: string
  aiSummary: string
  risks: string[]
  goodDecisions: string[]
  wealthImpact: number
  healthImpact: number
  happinessImpact: number
  timestamp: Date
}

export interface IndividualStudentResultsProps {
  studentName: string
  studentId: string
  finalScore: {
    wealth: number
    health: number
    happiness: number
  }
  scenarios: ScenarioResult[]
  onBack: () => void
}

export function IndividualStudentResults(props: IndividualStudentResultsProps) {
  const { studentName, finalScore, scenarios, onBack } = props
  const [currentScenario, setCurrentScenario] = useState(0)
  const scenario = scenarios[currentScenario]

  const handleExport = () => {
    alert(`Export functionality would download ${studentName}'s report as PDF`)
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" className="text-white hover:bg-slate-800">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Classroom
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
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl text-white">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="mb-1 text-3xl text-white">{studentName}</h1>
              <p className="text-purple-200">Student Performance Review</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryStat label="Final Wealth" value={`$${finalScore.wealth.toLocaleString()}`} accent="text-green-400" />
            <SummaryStat label="Final Health" value={`${finalScore.health}%`} accent="text-blue-400" />
            <SummaryStat label="Final Happiness" value={`${finalScore.happiness}%`} accent="text-purple-400" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl text-white">
            Student Responses ({currentScenario + 1} of {scenarios.length})
          </h2>
          <div className="text-sm text-slate-400">{scenario.timestamp.toLocaleString()}</div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          <div className="border-b border-slate-700 bg-slate-900 p-6">
            <h3 className="mb-2 text-xl text-white">{scenario.title}</h3>
            <p className="text-slate-300">{scenario.scenario}</p>
          </div>
          <div className="border-b border-slate-700 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                {studentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="mb-1 text-sm text-slate-400">Student Response</p>
                <p className="leading-relaxed text-white">{scenario.studentResponse}</p>
              </div>
            </div>
          </div>
          <div className="border-b border-slate-700 bg-slate-900/50 px-6 py-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span>Impact:</span>
              <ImpactBadge label="Wealth" value={scenario.wealthImpact} prefix="$" />
              <ImpactBadge label="Health" value={scenario.healthImpact} suffix="%" />
              <ImpactBadge label="Happiness" value={scenario.happinessImpact} suffix="%" />
            </div>
          </div>
          <div className="border-b border-slate-700 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                <span className="text-sm">AI</span>
              </div>
              <div>
                <p className="mb-2 text-sm text-slate-400">AI Analysis</p>
                <p className="leading-relaxed text-white">{scenario.aiSummary}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-2">
            {scenario.risks.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2 text-orange-400">
                  <AlertTriangle className="h-5 w-5" />
                  <h4>Areas for Improvement</h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {scenario.risks.map((risk) => (
                    <li key={risk} className="flex gap-2">
                      <span className="text-orange-400">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {scenario.goodDecisions.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <h4>Great Decisions</h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {scenario.goodDecisions.map((decision) => (
                    <li key={decision} className="flex gap-2">
                      <span className="text-green-400">•</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            onClick={() => setCurrentScenario((index) => Math.max(0, index - 1))}
            disabled={currentScenario === 0}
            variant="outline"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Previous Scenario
          </Button>
          <div className="flex gap-2">
            {scenarios.map((_, index) => (
              <button
                key={scenario.id + index}
                type="button"
                onClick={() => setCurrentScenario(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentScenario ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Go to scenario ${index + 1}`}
              />
            ))}
          </div>
          <Button
            onClick={() =>
              setCurrentScenario((index) => Math.min(scenarios.length - 1, index + 1))
            }
            disabled={currentScenario === scenarios.length - 1}
            variant="outline"
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Next Scenario
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="mb-4 flex items-center gap-3">
            <User className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg text-white">Teacher Notes</h3>
          </div>
          <textarea
            placeholder="Add private notes about this student's performance..."
            className="min-h-[100px] w-full rounded-lg border border-slate-700 bg-slate-900 p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="mt-3 flex justify-end">
            <Button className="bg-purple-600 hover:bg-purple-700">Save Notes</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <div className={`${accent} mb-1 text-2xl`}>{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  )
}

function ImpactBadge({
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
  const Icon = value >= 0 ? TrendingUp : TrendingDown
  const tone = value >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className={`flex items-center gap-2 ${tone}`}>
      <span className="text-slate-400">{label}</span>
      <Icon className="h-4 w-4" />
      {value >= 0 ? '+' : ''}
      {prefix}
      {Math.abs(value)}
      {suffix}
    </div>
  )
}
