import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  LogOut,
  Play,
  Plus,
  RefreshCw,
} from 'lucide-react'

import { ApiError, api, setAuthToken, type AnalyticsSummary, type SessionSummary } from '../api'
import { clearTeacherAuth, loadTeacherAuth } from '../teacherAuth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { ClassroomSimulationSummary } from '../components/teacher/ClassroomSimulationSummary'
import { Leaderboard } from '../components/teacher/Leaderboard'

type DashboardView = 'list' | 'classroom' | 'leaderboard' | 'summary'

function formatStatusLabel(status: string) {
  switch (status) {
    case 'in_progress':
      return 'Live simulation'
    case 'completed':
      return 'Completed'
    case 'waiting_for_start':
    default:
      return 'Waiting to start'
  }
}

function statusColors(status: string) {
  switch (status) {
    case 'in_progress':
      return 'border-green-500 text-green-300'
    case 'completed':
      return 'border-slate-500 text-slate-300'
    default:
      return 'border-amber-500 text-amber-300'
  }
}

function formatMonthlyIncome(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return `€${value.toLocaleString()}`
}

export function TeacherDashboardPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState(() => loadTeacherAuth())
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [view, setView] = useState<DashboardView>('list')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newClassroom, setNewClassroom] = useState({ name: '', location: '', monthlyIncome: 3500 })
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<Record<string, AnalyticsSummary>>({})

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  )

  const selectedAnalytics = selectedSession ? analytics[selectedSession.sessionId] : null

  useEffect(() => {
    if (!auth) {
      navigate('/teacher', { replace: true })
      return
    }
    setAuthToken(auth.token)
    refreshSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token])

  const refreshSessions = async () => {
    if (!auth) return
    setLoadingSessions(true)
    setError(null)
    try {
      const response = await api.listTeacherSessions(auth.teacherId)
      setSessions(response)
    } catch (sessionError) {
      const message = sessionError instanceof ApiError && typeof sessionError.body === 'object'
        ? (sessionError.body as { message?: string } | null)?.message
        : null
      setError(message ?? 'Unable to fetch sessions right now.')
    } finally {
      setLoadingSessions(false)
    }
  }

  const ensureAnalytics = async (sessionId: string) => {
    if (analytics[sessionId]) return
    setLoadingAnalytics(true)
    try {
      const summary = await api.fetchAnalyticsSummary(sessionId)
      setAnalytics((previous) => ({ ...previous, [sessionId]: summary }))
    } catch (analyticsError) {
      const message = analyticsError instanceof ApiError && typeof analyticsError.body === 'object'
        ? (analyticsError.body as { message?: string } | null)?.message
        : null
      setError(message ?? 'Unable to load analytics for this session.')
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const handleCreateClassroom = async () => {
    if (!auth) return
    if (!newClassroom.name.trim() || !newClassroom.location.trim()) return
    try {
      await api.createTeacherSession(auth.teacherId, {
        sessionName: newClassroom.name.trim(),
        location: newClassroom.location.trim(),
        monthlyIncome: newClassroom.monthlyIncome,
      })
      await refreshSessions()
      setShowCreateDialog(false)
      setNewClassroom({ name: '', location: '', monthlyIncome: 3500 })
    } catch (createError) {
      const message = createError instanceof ApiError && typeof createError.body === 'object'
        ? (createError.body as { message?: string } | null)?.message
        : null
      setError(message ?? 'Unable to create classroom. Please try again.')
    }
  }

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setView('classroom')
    await ensureAnalytics(sessionId)
  }

  const handleStartSession = async () => {
    if (!auth || !selectedSession) return
    try {
      const started = await api.startTeacherSession(auth.teacherId, selectedSession.sessionId)
      setSessions((previous) =>
        previous.map((session) =>
          session.sessionId === selectedSession.sessionId
            ? { ...session, status: started.status, startedAt: started.startedAt }
            : session,
        ),
      )
    } catch (startError) {
      const message = startError instanceof ApiError && typeof startError.body === 'object'
        ? (startError.body as { message?: string } | null)?.message
        : null
      setError(message ?? 'Unable to start the session right now.')
    }
  }

  const handleLogout = () => {
    clearTeacherAuth()
    setAuth(null)
    setSessions([])
    setSelectedSessionId(null)
    setAnalytics({})
    setView('list')
    navigate('/teacher')
  }

  if (!auth) {
    return null
  }

  if (view === 'leaderboard' && selectedSession) {
    return (
      <Leaderboard
        sessionId={selectedSession.sessionId}
        sessionName={selectedSession.sessionName}
        onBack={() => setView('classroom')}
      />
    )
  }

  if (view === 'summary' && selectedSession && selectedAnalytics) {
    return (
      <ClassroomSimulationSummary
        classroomName={selectedSession.sessionName}
        sessionId={selectedSession.sessionId}
        analytics={selectedAnalytics}
        onBack={() => setView('classroom')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl text-white">Teacher Dashboard</h1>
            <p className="text-slate-400">Launch sessions, monitor progress, and turn habits into insights.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-slate-600 text-white" onClick={refreshSessions} disabled={loadingSessions}>
              {loadingSessions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh
            </Button>
            <Button variant="outline" className="border-rose-500/60 text-rose-200" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700" size="lg">
                  <Plus className="mr-2 h-5 w-5" />Create classroom
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-700 bg-slate-900">
                <DialogHeader>
                  <DialogTitle>New classroom</DialogTitle>
                  <DialogDescription>Seed a fresh simulation cohort.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); handleCreateClassroom() }}>
                  <div>
                    <Label className="text-slate-200" htmlFor="classroom-name">Classroom name</Label>
                    <Input
                      id="classroom-name"
                      value={newClassroom.name}
                      onChange={(event) => setNewClassroom((previous) => ({ ...previous, name: event.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-200" htmlFor="classroom-location">Location</Label>
                    <Input
                      id="classroom-location"
                      value={newClassroom.location}
                      onChange={(event) => setNewClassroom((previous) => ({ ...previous, location: event.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-200" htmlFor="classroom-income">Monthly income (simulation)</Label>
                    <Input
                      id="classroom-income"
                      type="number"
                      value={newClassroom.monthlyIncome}
                      onChange={(event) => setNewClassroom((previous) => ({ ...previous, monthlyIncome: Number(event.target.value) || 0 }))}
                      className="mt-2"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={!newClassroom.name.trim() || !newClassroom.location.trim()}>
                    Create
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {error && <div className="rounded-2xl border border-rose-500/40 bg-rose-500/20 p-4 text-sm text-rose-50">{error}</div>}

        {view === 'classroom' && selectedSession ? (
          <ClassroomDetail
            session={selectedSession}
            analytics={selectedAnalytics}
            loadingAnalytics={loadingAnalytics}
            onBack={() => {
              setSelectedSessionId(null)
              setView('list')
            }}
            onStartSession={handleStartSession}
            onViewLeaderboard={() => setView('leaderboard')}
            onViewSummary={() => selectedAnalytics ? setView('summary') : ensureAnalytics(selectedSession.sessionId)}
            onRefreshAnalytics={() => ensureAnalytics(selectedSession.sessionId)}
          />
        ) : (
          <SessionGrid
            sessions={sessions}
            loading={loadingSessions}
            onSelect={handleSelectSession}
          />
        )}
      </div>
    </div>
  )
}

function SessionGrid({
  sessions,
  loading,
  onSelect,
}: {
  sessions: SessionSummary[]
  loading: boolean
  onSelect: (sessionId: string) => void
}) {
  if (loading && sessions.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 text-center">
        <p className="text-lg text-white">No classrooms yet</p>
        <p className="text-sm text-slate-400">Create your first session to get students playing.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session) => (
        <button
          key={session.sessionId}
          type="button"
          onClick={() => onSelect(session.sessionId)}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-blue-500/60"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl text-white">{session.sessionName}</h3>
              <p className="text-sm text-slate-400">{session.location || 'Location TBD'}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusColors(session.status)}`}>
              {formatStatusLabel(session.status)}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-400">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Join code</p>
              <p className="font-mono text-lg text-white">{session.joinCode}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
              <p className="text-lg text-white">{session.playerCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Monthly income</p>
              <p className="text-white">{formatMonthlyIncome(session.monthlyIncome)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
              <p className="text-white">{session.status.replaceAll('_', ' ')}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-300">Open classroom →</div>
        </button>
      ))}
    </div>
  )
}

function ClassroomDetail({
  session,
  analytics,
  loadingAnalytics,
  onBack,
  onStartSession,
  onViewLeaderboard,
  onViewSummary,
  onRefreshAnalytics,
}: {
  session: SessionSummary
  analytics: AnalyticsSummary | null
  loadingAnalytics: boolean
  onBack: () => void
  onStartSession: () => void
  onViewLeaderboard: () => void
  onViewSummary: () => void
  onRefreshAnalytics: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to classrooms
          </Button>
          <div>
            <h2 className="text-2xl text-white">{session.sessionName}</h2>
            <p className="text-sm text-slate-400">{session.location || 'Location TBD'} • {session.playerCount} students</p>
          </div>
        </div>
        <div className={`rounded-full border px-4 py-1 text-sm ${statusColors(session.status)}`}>
          {formatStatusLabel(session.status)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Join code</p>
          <p className="font-mono text-2xl text-white">{session.joinCode}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Monthly income</p>
          <p className="text-2xl text-white">{formatMonthlyIncome(session.monthlyIncome)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Started at</p>
          <p className="text-2xl text-white">{session.startedAt ? new Date(session.startedAt).toLocaleTimeString() : 'Not started'}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            className="bg-green-600 hover:bg-green-700"
            disabled={session.status === 'in_progress'}
            onClick={onStartSession}
          >
            <Play className="mr-2 h-4 w-4" /> Start session
          </Button>
          <Button variant="outline" className="border-slate-700 text-white" onClick={onViewLeaderboard}>
            <BarChart3 className="mr-2 h-4 w-4" /> View leaderboard
          </Button>
          <Button
            variant="outline"
            className="border-slate-700 text-white"
            onClick={onViewSummary}
            disabled={!analytics}
          >
            Insights summary
          </Button>
          <Button
            variant="ghost"
            className="text-slate-300"
            onClick={onRefreshAnalytics}
            disabled={loadingAnalytics}
          >
            {loadingAnalytics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh analytics
          </Button>
        </div>
      </div>

      <HabitsPanel analytics={analytics} />
    </div>
  )
}

function HabitsPanel({ analytics }: { analytics: AnalyticsSummary | null }) {
  if (!analytics) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
        Load analytics to see habit trends for this classroom.
      </div>
    )
  }

  const habitEntries = Object.entries(analytics.habitAverages)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl text-white">Habit trends</h3>
          <p className="text-sm text-slate-400">Hidden behaviors shaping the long-term impact of decisions.</p>
        </div>
        <div className="text-sm text-slate-400">
          Engagement {Math.round(analytics.classroomSummary.engagementRate * 100)}% • Avg core scenarios {analytics.classroomSummary.avgScenariosCompleted.toFixed(1)}
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {habitEntries.map(([habit, value]) => (
          <div key={habit} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{habit}</p>
            <p className="text-2xl text-white">{value.mean.toFixed(1)}</p>
            <p className="text-sm text-slate-400">Trend: {value.trend}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <h4 className="text-sm uppercase tracking-wide text-slate-500">AI recommendations</h4>
        <ul className="mt-2 space-y-2 text-sm text-slate-300">
          {analytics.recommendations.map((recommendation) => (
            <li key={recommendation.curriculumRef} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-slate-200">{recommendation.summary}</p>
              <p className="text-xs text-slate-500">{recommendation.rationale}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
