const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

export type SessionStatus = 'waiting_for_start' | 'in_progress' | 'completed'

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthToken {
  teacherId: string
  token: string
  expiresInSeconds: number
}

export interface CreateTeacherSessionPayload {
  sessionName: string
  location: string
  monthlyIncome: number
}

export interface SessionSummary {
  sessionId: string
  sessionName: string
  joinCode: string
  status: SessionStatus
  startedAt?: string
  playerCount: number
  location: string
  monthlyIncome: number
}

export interface SessionStarted {
  sessionId: string
  status: SessionStatus
  startedAt: string
}

export interface JoinSessionResponse {
  sessionId: string
  studentId: string
  seatNumber: number
  initialStats: StudentStats
  sessionStatus?: SessionStatus
}

export interface StudentStats {
  wealth: number
  health: number
  happiness: number
  riskTaking: number
  overTrusting: number
  laziness: number
  impulsiveness: number
  scenariosDone: string[]
  longTermEffects: string[]
}

export interface StudentDashboardResponse {
  stats: StudentStats
  sessionStatus?: SessionStatus
}

export interface ScenarioView {
  scenarioId: string
  title: string
  scenarioText: string
}

export interface PromptMessagePayload {
  studentId: string
  message: string
  scenarioId: string
  timestamp: string
}

export interface StatEffect {
  stat: string
  delta: number
}

export interface PromptReply {
  promptId: string
  aiReply: string
  status: 'in_progress' | 'completed'
  accepted: boolean
  effects: StatEffect[]
  effectsSummary?: string | null
  updatedStats?: StudentStats | null
}

export interface LeaderboardEntry {
  rank: number
  studentId: string
  nickname: string
  wealth: number
  health: number
  happiness: number
  scenariosDone: number
}

export interface LeaderboardResponse {
  updatedAt: string
  entries: LeaderboardEntry[]
}

export interface ClassroomSummary {
  students: number
  engagementRate: number
  avgScenariosCompleted: number
}

export interface StatDistribution {
  median: number
  p90: number
  min: number
  max: number
}

export interface HabitAverage {
  mean: number
  trend: string
}

export interface LeaderboardHighlight {
  studentId: string
  nickname: string
  stat: string
  value: number
}

export interface Recommendation {
  curriculumRef: string
  summary: string
  rationale: string
}

export interface AnalyticsSummary {
  classroomSummary: ClassroomSummary
  statDistributions: Record<string, StatDistribution>
  habitAverages: Record<string, HabitAverage>
  leaderboardHighlights: LeaderboardHighlight[]
  recommendations: Recommendation[]
}

export interface StudentInsights {
  studentId: string
  summary: string
  weakPoints: Array<{ stat: string; reason: string }>
  strongPoints: Array<{ stat: string; reason: string }>
  trend: Record<string, number[]>
}

interface BackendSuccessfulResponse {
  res: string
}

interface BackendSessionSummary {
  sessionName: string
  joinCode: string
  status: SessionStatus
  startedAt?: string | null
  playerCount: number
  location: string
  monthlyIncome: number
}

const AUTH_COOKIE_NAME = 'authcookie'

let authToken: string | null = null

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4 || 4)) % 4
  const padded = normalized + '='.repeat(padding)

  if (typeof atob === 'function') {
    return atob(padded)
  }

  const bufferCtor = (globalThis as { Buffer?: { from(data: string, encoding: string): { toString(enc: string): string } } }).Buffer
  if (bufferCtor) {
    return bufferCtor.from(padded, 'base64').toString('utf-8')
  }

  throw new Error('Base64 decoding is not supported in this environment')
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const json = base64UrlDecode(parts[1])
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function getJwtExpiration(token: string): number | null {
  const payload = decodeJwtPayload(token)
  const exp = payload?.exp
  if (typeof exp === 'number') {
    return exp * 1000
  }
  return null
}

function deriveExpiresInSeconds(token: string): number {
  const expiresAt = getJwtExpiration(token)
  if (!expiresAt) {
    return 3600
  }
  const diffMs = expiresAt - Date.now()
  return Math.max(60, Math.floor(diffMs / 1000))
}

export function setAuthToken(token: string | null) {
  authToken = token

  if (typeof document === 'undefined') {
    return
  }

  if (!token) {
    document.cookie = `${AUTH_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Lax`
    return
  }

  const cookieParts = [`path=/`, `SameSite=Lax`]
  const expiresAt = getJwtExpiration(token)
  if (expiresAt) {
    cookieParts.push(`Expires=${new Date(expiresAt).toUTCString()}`)
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    cookieParts.push('Secure')
  }

  document.cookie = `${AUTH_COOKIE_NAME}=${token}; ${cookieParts.join('; ')}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let body: unknown = null
    try {
      const text = await response.text()
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }
    const message = (() => {
      if (typeof body !== 'object' || body === null) return undefined
      if ('message' in body && typeof (body as { message?: string }).message === 'string') {
        return (body as { message: string }).message
      }
      if ('err' in body && typeof (body as { err?: string }).err === 'string') {
        return (body as { err: string }).err
      }
      return undefined
    })()
    throw new ApiError(response.status, body, message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

export const api = {
  loginTeacher(payload: LoginPayload) {
    return request<BackendSuccessfulResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((response) => {
      const token = response.res
      const expiresInSeconds = deriveExpiresInSeconds(token)
      return {
        teacherId: payload.email,
        token,
        expiresInSeconds,
      }
    })
  },

  createTeacherSession(email: string, payload: CreateTeacherSessionPayload) {
    const requestBody = {
      email,
      sessionName: payload.sessionName,
      sessionLocation: payload.location,
      monthlyIncome: payload.monthlyIncome,
    }
    return request<BackendSuccessfulResponse>('/api/teachers/newSession', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
  },

  listTeacherSessions() {
    return request<BackendSessionSummary[]>('/api/teachers/sessions', {
      method: 'GET',
    }).then((sessions) =>
      sessions.map((session) => ({
        sessionId: session.joinCode,
        sessionName: session.sessionName,
        joinCode: session.joinCode,
        status: session.status,
        startedAt: session.startedAt ?? undefined,
        playerCount: session.playerCount,
        location: session.location,
        monthlyIncome: session.monthlyIncome,
      }))
    )
  },

  startTeacherSession(sessionId: string) {
    return request<SessionStarted>(`/api/teachers/sessions/${sessionId}/start`, {
      method: 'POST',
    })
  },

  joinSession(joinCode: string, userName: string) {
    return request<JoinSessionResponse>(`/api/sessions/${joinCode}/students`, {
      method: 'POST',
      body: JSON.stringify({ userName }),
    })
  },

  getStudentDashboard(sessionId: string, studentId: string) {
    return request<StudentDashboardResponse>(`/api/sessions/${sessionId}/students/${studentId}`)
  },

  fetchNextScenario(sessionId: string, studentId: string) {
    const query = new URLSearchParams({ studentId }).toString()
    return request<ScenarioView>(`/api/sessions/${sessionId}/next-scenario?${query}`)
  },

  sendPromptMessage(sessionId: string, promptId: string, payload: PromptMessagePayload) {
    return request<PromptReply>(`/api/sessions/${sessionId}/prompts/${promptId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  fetchLeaderboard(sessionId: string) {
    return request<LeaderboardResponse>(`/api/sessions/${sessionId}/leaderboard`)
  },

  fetchAnalyticsSummary(sessionId: string) {
    return request<AnalyticsSummary>(`/api/sessions/${sessionId}/analytics/summary`)
  },

  fetchStudentInsights(sessionId: string, studentId: string) {
    return request<StudentInsights>(`/api/sessions/${sessionId}/students/${studentId}/insights`)
  },
}

export type ApiClient = typeof api
export type { JoinSessionResponse as JoinGameResponse }
