import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Loader2, Send, Sparkles, Heart, Smile, Wallet } from 'lucide-react'
import { ApiError, api } from '../api'
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

  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const messageIdRef = useRef(0)
  const promptCounterRef = useRef(0)
  const [activePromptId, setActivePromptId] = useState(() => `prm-ui-${promptCounterRef.current}`)

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
    } catch (dashboardError) {
      console.warn('Unable to sync player stats', dashboardError)
    }
  }, [player, sessionId])

  const loadScenario = useCallback(async () => {
    if (!player || !sessionId) return
    setStatus('loadingScenario')
    setError(null)
    setResult(null)
    try {
      const view = await api.fetchNextScenario(sessionId, player.studentId)
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
      const message = scenarioError instanceof ApiError && typeof scenarioError.body === 'object'
        ? (scenarioError.body as { message?: string } | null)?.message
        : null
      setError(message ?? 'Unable to load the next scenario just yet.')
    } finally {
      setStatus('idle')
    }
  }, [nextPromptId, player, sessionId])

  useEffect(() => {
    if (locationState) {
      setPlayer(locationState)
      persistPlayerSession(locationState)
    }
  }, [locationState])

  useEffect(() => {
    if (!player || !sessionId) return
    syncStats()
    loadScenario()
  }, [player, sessionId, loadScenario, syncStats])

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
      const message = sendError instanceof ApiError && typeof sendError.body === 'object'
        ? (sendError.body as { message?: string } | null)?.message
        : null
      setError(message ?? 'Could not contact the game server.')
    } finally {
      setStatus('idle')
    }
  }

  const handleNextScenario = () => {
    loadScenario()
  }

  if (!player || !sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-white">
        <p className="text-lg">We need your classroom code again to resume the game.</p>
      </div>
    )
  }

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
            <h2 className="text-xl font-semibold text-white">{scenario?.title ?? 'Connecting to live game...'}</h2>
          </div>

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
                placeholder={scenario ? 'Explain your next move…' : 'Waiting on the next scenario prompt...'}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-transparent p-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/60 focus:outline-none"
                disabled={status !== 'idle' || !scenario || result?.status === 'completed'}
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
                  disabled={status !== 'idle' || !scenario || result?.status === 'completed' || !inputText.trim()}
                >
                  {status === 'sending' ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                  {status === 'sending' ? 'Sending' : 'Send'}
                </Button>
                <div className="text-xs text-slate-500">Press Enter to send • Shift + Enter for a new line</div>
              </div>
            </div>
          </div>
        </section>

        {result && (
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
            <Button className="mt-4 w-full" onClick={handleNextScenario}>
              Load next scenario
            </Button>
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <HabitBreakdown stats={stats} />
          <LongTermEffectsPanel effects={stats.longTermEffects} />
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/20 p-3 text-sm text-rose-50">{error}</div>
        )}
      </main>
    </div>
  )
}

function HabitBreakdown({ stats }: { stats: StudentStats }) {
  const habitStats = [
    { label: 'Risk taking', value: stats.riskTaking },
    { label: 'Over trusting', value: stats.overTrusting },
    { label: 'Laziness', value: stats.laziness },
    { label: 'Impulsiveness', value: stats.impulsiveness },
  ]
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <h3 className="text-lg text-white">Habit signals</h3>
      <p className="text-sm text-slate-400">Hidden traits driving long-term effects.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {habitStats.map((habit) => (
          <div key={habit.label} className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{habit.label}</p>
            <p className="text-2xl text-white">{habit.value.toFixed(1)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function LongTermEffectsPanel({ effects }: { effects: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <h3 className="text-lg text-white">Long-term effects</h3>
      {effects.length === 0 ? (
        <p className="text-sm text-slate-400">No long-term effects logged yet. Finish more scenarios to unlock them.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm text-slate-200">
          {effects.map((effect) => (
            <li key={effect} className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
              {effect}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
