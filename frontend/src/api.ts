import type { Scenario, ScenarioEffect, ScenarioResult, StatName } from './types'

const mockScenarios: Scenario[] = [
  {
    id: 'scenario-budget-basics',
    title: 'First Apartment Budget',
    description:
      'You just moved into your first place. Balance rent, savings, and fun spending without going broke mid-month.',
    estimatedTimeSeconds: 90,
    prompts: [
      {
        id: 'prompt-income-split',
        text: 'How much of your $2,400 income do you allocate for essential expenses each month?',
        expectedAnswerType: 'numeric',
        context: { currency: 'USD' },
      },
      {
        id: 'prompt-priority',
        text: 'Which priority do you pick for the rest of your budget?',
        expectedAnswerType: 'choice',
        options: ['Aggressive savings', 'Paying down debt', 'Lifestyle upgrades'],
      },
      {
        id: 'prompt-reflection',
        text: 'Explain why this priority fits your strategy.',
        expectedAnswerType: 'free-text',
      },
    ],
  },
  {
    id: 'scenario-side-hustle',
    title: 'Side Hustle Trade-offs',
    description:
      'A friend offers a weekend gig. Decide whether the extra cash outweighs the energy cost during the school week.',
    estimatedTimeSeconds: 75,
    prompts: [
      {
        id: 'prompt-weekend-hours',
        text: 'How many hours will you commit to the side hustle?',
        expectedAnswerType: 'numeric',
      },
      {
        id: 'prompt-habit-impact',
        text: 'Pick the area that could suffer the most when you add the extra work.',
        expectedAnswerType: 'choice',
        options: ['Sleep schedule', 'Grades', 'Social time'],
      },
      {
        id: 'prompt-mitigation',
        text: 'How will you prevent that trade-off from derailing you?',
        expectedAnswerType: 'free-text',
      },
    ],
  },
]

type JoinGamePayload = {
  classroomCode: string
  nickname: string
}

type JoinGameResponse = {
  sessionId: string
  playerId: string
  seatNumber: number
}

type SubmitScenarioPayload = {
  sessionId: string
  playerId: string
  scenarioId: string
  answers: Record<string, string>
}

type RecordPromptResponsePayload = {
  sessionId: string
  scenarioId: string
  promptId: string
  answer: string
}

const mockDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms))

type MockRequestMeta = {
  method: 'GET' | 'POST'
  endpoint: string
}

function logMockRequest(meta: MockRequestMeta, payload?: unknown) {
  const bodyLabel = payload ? 'payload' : 'no payload'
  console.info(`[Mock API] → ${meta.method} ${meta.endpoint} (${bodyLabel})`, payload)
}

function logMockResponse(meta: MockRequestMeta, response: unknown, startedAt: number) {
  const duration = Date.now() - startedAt
  console.info(`[Mock API] ← ${meta.method} ${meta.endpoint} (${duration}ms)`, response)
}

const statList: StatName[] = ['wealth', 'health', 'happiness']

function summarizeEffects(effects: ScenarioEffect[]) {
  if (!effects.length) {
    return 'No major stat changes detected. Keep experimenting to see bigger swings.'
  }
  const strongest = effects.reduce((previous, current) =>
    Math.abs(current.delta) > Math.abs(previous.delta) ? current : previous,
  )
  const direction = strongest.delta >= 0 ? 'boosted' : 'reduced'
  return `Your decisions ${direction} ${strongest.stat} by ${Math.abs(strongest.delta)} points.`
}

function computeEffectsFromAnswers(answers: Record<string, string>): ScenarioEffect[] {
  const combinedLength = Object.values(answers).reduce((acc, value) => acc + value.length, 0)

  return statList.map((stat, index) => {
    const swing = ((combinedLength + index * 7) % 21) - 10 // deterministic-ish mock swing
    return {
      stat,
      delta: swing,
    }
  })
}

export function createApiClient() {
  let scenarioCursor = 0

  return {
    async joinGame(payload: JoinGamePayload): Promise<JoinGameResponse> {
      const requestMeta: MockRequestMeta = { method: 'POST', endpoint: '/api/classrooms/join' }
      logMockRequest(requestMeta, payload)
      const startedAt = Date.now()
      await mockDelay(500)

      if (!payload.classroomCode.trim()) {
        throw new Error('Classroom code is required.')
      }

      if (!payload.nickname.trim()) {
        throw new Error('Add a nickname so teammates can see you.')
      }
      const response = {
        sessionId: `session_${payload.classroomCode.trim().toLowerCase()}`,
        playerId: `player_${payload.nickname.trim().toLowerCase()}`,
        seatNumber: Math.floor(Math.random() * 28) + 1,
      }

      logMockResponse(requestMeta, response, startedAt)
      return response
    },

    async fetchNextScenario(sessionId: string): Promise<Scenario> {
      const requestMeta: MockRequestMeta = {
        method: 'GET',
        endpoint: `/api/sessions/${sessionId}/next-scenario`,
      }
      logMockRequest(requestMeta, { sessionId })
      const startedAt = Date.now()
      await mockDelay(700)
      const baseScenario = mockScenarios[scenarioCursor % mockScenarios.length]
      scenarioCursor += 1

      const scenario = {
        ...baseScenario,
        id: `${baseScenario.id}_${scenarioCursor}_${sessionId}`,
        prompts: baseScenario.prompts.map((prompt, idx) => ({
          ...prompt,
          id: `${baseScenario.id}_${scenarioCursor}_prompt_${idx}`,
        })),
      }

      logMockResponse(requestMeta, scenario, startedAt)
      return scenario
    },

    async submitScenarioResponse(payload: SubmitScenarioPayload): Promise<ScenarioResult> {
      const requestMeta: MockRequestMeta = {
        method: 'POST',
        endpoint: `/api/sessions/${payload.sessionId}/scenarios/${payload.scenarioId}`,
      }
      logMockRequest(requestMeta, payload)
      const startedAt = Date.now()
      await mockDelay(900)
      const effects = computeEffectsFromAnswers(payload.answers)

      const response = {
        scenarioId: payload.scenarioId,
        userId: payload.playerId,
        completedAt: Date.now(),
        effects,
        effectsSummary: `${summarizeEffects(effects)} You logged ${Object.keys(payload.answers).length} decisions for this scenario.`,
      }

      logMockResponse(requestMeta, response, startedAt)
      return response
    },

    async recordPromptResponse(payload: RecordPromptResponsePayload) {
      const requestMeta: MockRequestMeta = {
        method: 'POST',
        endpoint: `/api/sessions/${payload.sessionId}/prompts/${payload.promptId}`,
      }
      logMockRequest(requestMeta, payload)
      const startedAt = Date.now()
      await mockDelay(350)
      const response = { accepted: true, savedAt: Date.now() }
      logMockResponse(requestMeta, response, startedAt)
      return response
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

export const api = createApiClient()

export type { JoinGamePayload, JoinGameResponse, SubmitScenarioPayload }
