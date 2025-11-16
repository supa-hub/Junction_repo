import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Loader2, Send, Sparkles, Heart, Smile, Wallet } from 'lucide-react'
import { ApiError, api, type SessionStatus } from '../api'
import type { PromptReply, ScenarioView, StatEffect, StudentStats } from '../api'
import { Button } from '../components/ui/button'
import { cn } from '../components/ui/utils'
import { loadPlayerSession, persistPlayerSession, type PlayerSession } from '../playerSession'

const EURO_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

type NumericStatKey = 'wealth' | 'health' | 'happiness' | 'riskTaking' | 'overTrusting' | 'laziness' | 'impulsiveness'

const numericStatKeys: NumericStatKey[] = ['wealth', 'health', 'happiness', 'riskTaking', 'overTrusting', 'laziness', 'impulsiveness']

const defaultStats: StudentStats = {
  wealth: 0,
  health: 0,
  happiness: 0,
  riskTaking: 0,
  overTrusting: 0,
  laziness: 0,
  impulsiveness: 0,
  scenariosDone: [],
  longTermEffects: [],
}

type ChatSender = 'guide' | 'player' | 'system'

type ChatMessage = {
  id: string
  sender: ChatSender
  text: string
  timestamp: number
  tag?: string
}

type LocationState = {
  player?: PlayerSession
}

type StatCardProps = {
  icon: ReactNode
  label: string
  value: number
  tone: 'blue' | 'rose' | 'amber'
  format?: 'percent' | 'currency'
}

function StatCard({ icon, label, value, tone, format = 'percent' }: StatCardProps) {
  const barTone = {
    blue: 'bg-blue-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-400',
  }[tone]

  const formattedValue =
    format === 'currency'
      ? EURO_FORMATTER.format(Math.max(0, Math.round(value)))
      : `${value}%`

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 text-slate-300">
        {icon}
        <span className="text-sm uppercase tracking-wide">{label}</span>
        <span className="ml-auto font-semibold text-white">{formattedValue}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className={cn('h-2 rounded-full transition-all duration-500', barTone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function applyEffects(base: StudentStats, effects: StatEffect[]): StudentStats {
  return effects.reduce((next, effect) => {
    if (numericStatKeys.includes(effect.stat as NumericStatKey)) {
      const statKey = effect.stat as NumericStatKey
      const current = next[statKey]
      next[statKey] = clampStat(current + effect.delta) as StudentStats[typeof statKey]
    }
    return next
  }, { ...base })
}

export function PlaySessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const locationState = (location.state as LocationState | undefined)?.player

  const [player, setPlayer] = useState<PlayerSession | null>(() => {
    if (!sessionId) return null
    return loadPlayerSession(sessionId)
  })
  const [scenario, setScenario] = useState<ScenarioView | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loadingScenario' | 'sending'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PromptReply | null>(null)
  const [stats, setStats] = useState<StudentStats>(() => player?.initialStats ?? defaultStats)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(() => player?.sessionStatus ?? null)

  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const messageIdRef = useRef(0)
  const promptCounterRef = useRef(0)
  const [activePromptId, setActivePromptId] = useState(() => `prm-ui-${promptCounterRef.current}`)
  const waitingNoticeRef = useRef(false)

  const nextMessageId = () => {
    messageIdRef.current += 1
    return `msg-${messageIdRef.current}`
  }

  const nextPromptId = useCallback(() => {
    promptCounterRef.current += 1
    return `prm-ui-${promptCounterRef.current}`
  }, [])

  const appendMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'> & Partial<Pick<ChatMessage, 'id' | 'timestamp'>>) => {
    setMessages((previous) => [
      ...previous,
      {
        id: message.id ?? nextMessageId(),
        timestamp: message.timestamp ?? Date.now(),
        sender: message.sender,
        text: message.text,
        tag: message.tag,
      },
    ])
  }, [])

  const syncStats = useCallback(async () => {
    if (!player || !sessionId) return
    try {
      const dashboard = await api.getStudentDashboard(sessionId, player.studentId)
      setStats(dashboard.stats)
      setSessionStatus((previous) => dashboard.sessionStatus ?? previous ?? player.sessionStatus ?? null)
    } catch (dashboardError) {
      console.warn('Unable to sync player stats', dashboardError)
      setSessionStatus((previous) => previous ?? player.sessionStatus ?? null)
    }
  }, [player, sessionId])

  const loadScenario = useCallback(async () => {
    if (!player || !sessionId) return
    if (sessionStatus && sessionStatus !== 'in_progress') return
    setStatus('loadingScenario')
    setError(null)
    setResult(null)
    try {
      const view = await api.fetchNextScenario(sessionId, player.studentId)
      setSessionStatus('in_progress')
      setScenario(view)
      setMessages([
        {
          id: nextMessageId(),
          sender: 'guide',
          text: view.title,
          timestamp: Date.now(),
          tag: 'Scenario',
        },
        {
          id: nextMessageId(),
          sender: 'guide',
          text: view.scenarioText,
          timestamp: Date.now(),
        },
        {
          id: nextMessageId(),
          sender: 'system',
          text: 'Share your plan and I will react in real time.',
          timestamp: Date.now(),
          tag: 'Guide',
        },
      ])
      const newPromptId = nextPromptId()
      setActivePromptId(newPromptId)
    } catch (scenarioError) {
      if (scenarioError instanceof ApiError) {
        setError(scenarioError.message)
      } else if (scenarioError instanceof Error) {
        setError(scenarioError.message)
      } else {
        setError('Unable to load the next scenario just yet.')
      }
      if (scenarioError instanceof ApiError && (scenarioError.status === 409 || scenarioError.status === 423)) {
        setSessionStatus('waiting_for_start')
      }
    } finally {
      setStatus('idle')
    }
  }, [nextPromptId, player, sessionId, sessionStatus])

  useEffect(() => {
    if (locationState) {
      setPlayer(locationState)
      persistPlayerSession(locationState)
      setSessionStatus(locationState.sessionStatus ?? null)
    }
  }, [locationState])

  useEffect(() => {
    if (!player || !sessionId) return
    syncStats()
  }, [player, sessionId, syncStats])

  useEffect(() => {
    if (!player || !sessionId) return
    if (sessionStatus === 'in_progress') {
      waitingNoticeRef.current = false
      loadScenario()
      return
    }

    if (!sessionStatus) return

    setScenario(null)
    setResult(null)

    if ((sessionStatus === 'waiting_for_start' || sessionStatus === 'completed') && !waitingNoticeRef.current) {
      waitingNoticeRef.current = true
      setMessages(() => {
        const noticeId = nextMessageId()
        const noticeText = sessionStatus === 'waiting_for_start'
          ? 'Waiting for game to start'
          : 'This classroom simulation has ended. Thank you for playing!'
        return [
          {
            id: noticeId,
            sender: 'system',
            text: noticeText,
            timestamp: Date.now(),
            tag: 'Status',
          },
        ]
      })
    }
  }, [player, sessionId, sessionStatus, loadScenario])

  useEffect(() => {
    if (!player || !sessionId) return
    if (sessionStatus && sessionStatus !== 'waiting_for_start') return
    const intervalId = window.setInterval(() => {
      syncStats()
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [player, sessionId, sessionStatus, syncStats])

  useEffect(() => {
    if (!sessionId || !sessionStatus) return
    setPlayer((previous) => {
      if (!previous) return previous
      if (previous.sessionStatus === sessionStatus) return previous
      const updated = { ...previous, sessionStatus }
      persistPlayerSession(updated)
      return updated
    })
  }, [sessionId, sessionStatus])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!player || !sessionId || !scenario || status === 'sending' || result?.status === 'completed') return
    const trimmed = inputText.trim()
    if (!trimmed) return
    const promptId = activePromptId || nextPromptId()
    setActivePromptId(promptId)
    appendMessage({ sender: 'player', text: trimmed })
    setInputText('')
    setStatus('sending')
    setError(null)

    try {
      const reply = await api.sendPromptMessage(sessionId, promptId, {
        studentId: player.studentId,
        scenarioId: scenario.scenarioId,
        message: trimmed,
        timestamp: new Date().toISOString(),
      })
      appendMessage({ sender: 'guide', text: reply.aiReply, tag: reply.status === 'completed' ? 'Outcome' : 'Guide' })
      setActivePromptId(reply.promptId ?? promptId)
      if (reply.status === 'completed') {
        setResult(reply)
        if (reply.updatedStats) {
          setStats(reply.updatedStats)
        } else if (reply.effects?.length) {
          setStats((previous) => applyEffects(previous, reply.effects))
        }
      }
    } catch (sendError) {
      if (sendError instanceof ApiError) {
        setError(sendError.message)
      } else if (sendError instanceof Error) {
        setError(sendError.message)
      } else {
        setError('Could not contact the game server.')
      }
    } finally {
      setStatus('idle')
    }
  }

  const handleNextScenario = () => {
    if (sessionStatus !== 'in_progress') return
    loadScenario()
  }

  if (!player || !sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
        <p className="text-lg">We need your classroom code again to resume the game.</p>
      </div>
    )
  }

  const isWaiting = sessionStatus === 'waiting_for_start'
  const isCompleted = sessionStatus === 'completed'
  const canSendMessage = !isWaiting && !isCompleted && status === 'idle' && !!scenario && (!result || result.status !== 'completed')

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={<Wallet className="size-5 text-blue-300" />} label="Wealth" value={stats.wealth} tone="blue" format="currency" />
            <StatCard icon={<Heart className="size-5 text-rose-300" />} label="Health" value={stats.health} tone="rose" />
            <StatCard icon={<Smile className="size-5 text-amber-300" />} label="Happiness" value={stats.happiness} tone="amber" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur">
          <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
            <p className="text-xs uppercase tracking-widest text-slate-400">Scenario</p>
            <h2 className="text-xl font-semibold text-white">
              {scenario?.title
                ?? (sessionStatus === 'waiting_for_start'
                  ? 'Waiting for game to start'
                  : sessionStatus === 'completed'
                    ? 'Session completed'
                    : 'Connecting to live game...')}
            </h2>
          </div>

          {isWaiting ? (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-10 text-center">
              <Loader2 className="mb-4 size-8 animate-spin text-slate-300" />
              <h3 className="text-lg font-semibold text-white">Waiting for game to start</h3>
              <p className="mt-2 max-w-md text-sm text-slate-400">Stay ready—your teacher will launch the simulation shortly.</p>
            </div>
          ) : isCompleted ? (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-10 text-center text-white">
              <h3 className="text-lg font-semibold">Session completed</h3>
              <p className="mt-2 max-w-md text-sm text-slate-100">This classroom simulation has wrapped up. Thanks for playing!</p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2">
                {messages.map((message) => (
                  <div key={message.id} className={cn('flex', message.sender === 'player' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-lg shadow-black/20',
                        message.sender === 'player' && 'bg-blue-600 text-white',
                        message.sender === 'guide' && 'border border-white/5 bg-slate-800 text-slate-100',
                        message.sender === 'system' && 'border border-purple-500/40 bg-purple-700/40 text-purple-100',
                      )}
                    >
                      {message.tag && (
                        <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">{message.tag}</p>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Respond</p>
                <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                  <textarea
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    placeholder={scenario
                      ? 'Explain your next move…'
                      : 'Waiting on the next scenario prompt...'}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/10 bg-transparent p-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/60 focus:outline-none"
                    disabled={!canSendMessage}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!canSendMessage || !inputText.trim()}
                    >
                      {status === 'sending' ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                      {status === 'sending' ? 'Sending' : 'Send'}
                    </Button>
                    <div className="text-xs text-slate-500">Press Enter to send • Shift + Enter for a new line</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {result && !isWaiting && !isCompleted && (
          <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-6 text-sm text-white">
            <div className="flex items-center gap-2 text-emerald-300">
              <Sparkles className="size-4" /> Scenario logged
            </div>
            {result.effectsSummary && <p className="mt-2 text-slate-100">{result.effectsSummary}</p>}
            <div className="mt-3 space-y-2 text-xs">
              {result.effects.map((effect) => (
                <div key={effect.stat} className="flex items-center justify-between">
                  <span className="uppercase tracking-wide text-slate-400">{effect.stat}</span>
                  <span className={effect.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {effect.delta >= 0 ? '+' : ''}
                    {effect.delta}
                  </span>
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full" onClick={handleNextScenario} disabled={sessionStatus !== 'in_progress'}>
              Load next scenario
            </Button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/20 p-3 text-sm text-rose-50">{error}</div>
        )}
      </main>
    </div>
  )
}
