import { useCallback, useEffect, useMemo, useState } from 'react'
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

import { ApiError, api, setAuthToken, type SessionSummary, type StudentRosterEntry } from '../api'
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
import { Leaderboard } from '../components/teacher/Leaderboard'

type DashboardView = 'list' | 'classroom' | 'leaderboard'

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
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roster, setRoster] = useState<StudentRosterEntry[]>([])

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  )


  const refreshSessions = useCallback(async () => {
    if (!auth) return
    setLoadingSessions(true)
    setError(null)
    try {
      const response = await api.listTeacherSessions()
      setSessions(response)
    } catch (sessionError) {
      if (sessionError instanceof ApiError) {
        setError(sessionError.message)
      } else if (sessionError instanceof Error) {
        setError(sessionError.message)
      } else {
        setError('Unable to fetch sessions right now.')
      }
    } finally {
      setLoadingSessions(false)
    }
  }, [auth])

  useEffect(() => {
    if (!auth) {
      navigate('/teacher', { replace: true })
      return
    }
    setAuthToken(auth.token)
    refreshSessions()
  }, [auth, navigate, refreshSessions])

  const handleCreateClassroom = async () => {
    if (!auth) return
    if (!newClassroom.name.trim() || !newClassroom.location.trim()) return
    try {
      await api.createTeacherSession(auth.email, {
        sessionName: newClassroom.name.trim(),
        location: newClassroom.location.trim(),
        monthlyIncome: newClassroom.monthlyIncome,
      })
      await refreshSessions()
      setShowCreateDialog(false)
      setNewClassroom({ name: '', location: '', monthlyIncome: 3500 })
    } catch (createError) {
      if (createError instanceof ApiError) {
        setError(createError.message)
      } else if (createError instanceof Error) {
        setError(createError.message)
      } else {
        setError('Unable to create classroom. Please try again.')
      }
    }
  }

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setView('classroom')
  }

  const handleStartSession = async () => {
    if (!auth || !selectedSession) return
    try {
      const started = await api.startTeacherSession(selectedSession.sessionId)
      setSessions((previous) =>
        previous.map((session) =>
          session.sessionId === selectedSession.sessionId
            ? { ...session, status: started.status, startedAt: started.startedAt }
            : session,
        ),
      )
    } catch (startError) {
      if (startError instanceof ApiError) {
        setError(startError.message)
      } else if (startError instanceof Error) {
        setError(startError.message)
      } else {
        setError('Unable to start the session right now.')
      }
    }
  }

  useEffect(() => {
    if (view !== 'classroom' || !selectedSessionId) {
      setRoster([])
      setLoadingRoster(false)
      return
    }

    let cancelled = false

    const loadRoster = async () => {
      try {
        const response = await api.fetchTeacherSessionRoster(selectedSessionId)
        if (cancelled) return
        setRoster(response.students)
        setSessions((previous) =>
          previous.map((session) =>
            session.sessionId === selectedSessionId
              ? { ...session, playerCount: response.students.length }
              : session,
          ),
        )
      } catch (rosterError) {
        if (!cancelled) {
          console.error('Failed to fetch roster', rosterError)
        }
      }
    }

    setRoster([])
    setLoadingRoster(true)

    loadRoster()
      .catch((rosterError) => {
        if (!cancelled) {
          console.error('Failed to fetch roster', rosterError)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRoster(false)
        }
      })

    const pollId = window.setInterval(() => {
      loadRoster().catch((rosterError) => {
        if (!cancelled) {
          console.error('Failed to fetch roster', rosterError)
        }
      })
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
    }
  }, [view, selectedSessionId])

  const handleLogout = () => {
    clearTeacherAuth()
    setAuthToken(null)
    setAuth(null)
    setSessions([])
    setSelectedSessionId(null)
    setRoster([])
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

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl text-white">Teacher Dashboard</h1>
            <p className="text-slate-400">Launch sessions and monitor progress for your classrooms.</p>
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
            roster={roster}
            loadingRoster={loadingRoster}
            onBack={() => {
              setSelectedSessionId(null)
              setRoster([])
              setView('list')
            }}
            onStartSession={handleStartSession}
            onViewLeaderboard={() => setView('leaderboard')}
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
  roster,
  loadingRoster,
  onBack,
  onStartSession,
  onViewLeaderboard,
}: {
  session: SessionSummary
  roster: StudentRosterEntry[]
  loadingRoster: boolean
  onBack: () => void
  onStartSession: () => void
  onViewLeaderboard: () => void
}) {
  const activeCount = roster.length
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to classrooms
          </Button>
          <div>
            <h2 className="text-2xl text-white">{session.sessionName}</h2>
            <p className="text-sm text-slate-400">{session.location || 'Location TBD'} • {activeCount} students</p>
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
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl text-white">Students</h3>
            <p className="text-sm text-slate-400">
              {activeCount === 0 ? 'No students have joined yet.' : `${activeCount} student${activeCount === 1 ? '' : 's'} connected`}
            </p>
          </div>
          {loadingRoster && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        </div>
        <div className="mt-4 space-y-3">
          {activeCount === 0 && !loadingRoster ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-400">
              Share the join code to see students appear here in real time.
            </div>
          ) : (
            roster.map((student) => (
              <div
                key={student.studentName}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg text-white">{student.studentName}</p>
                    <p className="text-xs text-slate-400">
                      Completed {student.completedScenarioCount} scenario{student.completedScenarioCount === 1 ? '' : 's'}
                      {student.currentScenarioTitle ? ` • Working on "${student.currentScenarioTitle}"` : ''}
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs uppercase tracking-wide text-slate-400">
                    <div>
                      <span className="block text-[11px] text-slate-500">Wealth</span>
                      <span className="text-white">€{Math.round(student.wealth).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-500">Health</span>
                      <span className="text-white">{Math.round(student.health)}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-500">Happiness</span>
                      <span className="text-white">{Math.round(student.happiness)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
