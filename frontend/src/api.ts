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

export interface SessionCreated {
  sessionId: string
  sessionName: string
  joinCode: string
  status: string
  location: string
  monthlyIncome: number
}

export interface SessionSummary {
  sessionId: string
  sessionName: string
  joinCode: string
  status: string
  startedAt?: string
  playerCount: number
  location: string
  monthlyIncome: number
}

export interface SessionStarted {
  sessionId: string
  status: string
  startedAt: string
}

export interface JoinSessionResponse {
  sessionId: string
  studentId: string
  seatNumber: number
  initialStats: StudentStats
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

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
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
    const message = typeof body === 'object' && body && 'message' in body ? (body as { message: string }).message : undefined
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
    return request<AuthToken>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  createTeacherSession(teacherId: string, payload: CreateTeacherSessionPayload) {
    return request<SessionCreated>(`/api/teachers/${teacherId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  listTeacherSessions(teacherId: string) {
    return request<SessionSummary[]>(`/api/teachers/${teacherId}/sessions`, {
      method: 'GET',
    })
  },

  startTeacherSession(teacherId: string, sessionId: string) {
    return request<SessionStarted>(`/api/teachers/${teacherId}/sessions/${sessionId}/start`, {
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
