import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Loader2, Send, Sparkles, Heart, Smile, Wallet } from 'lucide-react'
import { api } from '../api'
import type { Scenario, ScenarioPrompt, ScenarioResult, ScenarioEffect } from '../types'
import { Button } from '../components/ui/button'
import { cn } from '../components/ui/utils'
import { loadPlayerSession, persistPlayerSession, type PlayerSession } from '../playerSession'

const baseStats = {
  wealth: 72,
  health: 74,
  happiness: 68,
}

const EURO_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

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
        <span className="ml-auto text-white font-semibold">{formattedValue}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className={cn('h-2 rounded-full transition-all duration-500', barTone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function formatPromptMessage(prompt: ScenarioPrompt) {
  const optionSuffix = prompt.options?.length
    ? `Options: ${prompt.options.join(' / ')}`
    : prompt.expectedAnswerType === 'numeric'
      ? 'Answer with a number so we can score it.'
      : ''

  return [prompt.text, optionSuffix].filter(Boolean).join('\n\n')
}

function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function PlaySessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const locationState = (location.state as LocationState | undefined)?.player

  const [player, setPlayer] = useState<PlayerSession | null>(() => {
    if (!sessionId) return null
    return loadPlayerSession(sessionId)
  })
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [promptIndex, setPromptIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'fetching' | 'submitting'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [stats, setStats] = useState(baseStats)
  const [scenarioRequestId, setScenarioRequestId] = useState(0)

  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const messageIdRef = useRef(0)

  const nextMessageId = () => {
    messageIdRef.current += 1
    return `msg-${messageIdRef.current}`
  }

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

  const applyEffectsToStats = useCallback((effects: ScenarioEffect[]) => {
    setStats((previous) => {
      const next = { ...previous }
      effects.forEach((effect) => {
        if (effect.stat in next) {
          const statKey = effect.stat as keyof typeof next
          const current = next[statKey]
          if (typeof current === 'number') {
            next[statKey] = clampStat(current + effect.delta)
          }
        }
      })
      return next
    })
  }, [])

  const loadScenario = useCallback(async () => {
    if (!sessionId) return
    setStatus('fetching')
    setError(null)
    setResult(null)
    setResponses({})
    setInputText('')
    setPromptIndex(0)

    try {
      const nextScenario = await api.fetchNextScenario(sessionId)
      setScenario(nextScenario)
      setMessages(() => {
        const baseMessages: ChatMessage[] = [
          {
            id: nextMessageId(),
            sender: 'guide',
            text: nextScenario.title,
            timestamp: Date.now(),
            tag: 'New Scenario',
          },
        ]

        if (nextScenario.description) {
          baseMessages.push({
            id: nextMessageId(),
            sender: 'guide',
            text: nextScenario.description,
            timestamp: Date.now(),
          })
        }

        if (nextScenario.prompts[0]) {
          baseMessages.push({
            id: nextMessageId(),
            sender: 'guide',
            text: formatPromptMessage(nextScenario.prompts[0]),
            timestamp: Date.now(),
            tag: 'Scenario prompt',
          })
        }

        return baseMessages
      })
    } catch (scenarioError) {
      const message =
        scenarioError instanceof Error
          ? scenarioError.message
          : 'Unable to load the next scenario just yet.'
      setError(message)
    } finally {
      setStatus('idle')
    }
  }, [sessionId])

  useEffect(() => {
    if (locationState) {
      setPlayer(locationState)
      persistPlayerSession(locationState)
    }
  }, [locationState])

  useEffect(() => {
    if (!player || !sessionId) return
    loadScenario()
  }, [player, sessionId, scenarioRequestId, loadScenario])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activePrompt = scenario?.prompts[promptIndex]

  const handleSendMessage = async () => {
    if (!scenario || !activePrompt || !player || status === 'sending' || status === 'submitting') {
      return
    }

    const trimmed = inputText.trim()
    if (!trimmed) return

    const updatedResponses = {
      ...responses,
      [activePrompt.id]: trimmed,
    }

    setResponses(updatedResponses)
    setInputText('')
    appendMessage({ sender: 'player', text: trimmed })
    setError(null)

    const isFinalPrompt = promptIndex === scenario.prompts.length - 1
    setStatus('sending')

    try {
      await api.recordPromptResponse({
        sessionId: player.sessionId,
        scenarioId: scenario.id,
        promptId: activePrompt.id,
        answer: trimmed,
      })
    } catch (recordError) {
      const message =
        recordError instanceof Error ? recordError.message : 'Could not contact the game server.'
      setError(message)
      setStatus('idle')
      return
    }

    if (isFinalPrompt) {
      await submitScenario(updatedResponses)
      return
    }

    const nextIndex = promptIndex + 1
    setPromptIndex(nextIndex)

    setTimeout(() => {
      const nextPrompt = scenario.prompts[nextIndex]
      if (nextPrompt) {
        appendMessage({ sender: 'guide', text: formatPromptMessage(nextPrompt), tag: 'Scenario prompt' })
      }
      setStatus('idle')
    }, 450)
  }

  const submitScenario = async (payloadAnswers: Record<string, string>) => {
    if (!player || !scenario) return
    setStatus('submitting')
    appendMessage({ sender: 'guide', text: 'Give me a second to score those choices...', tag: 'Processing' })

    try {
      const submission = await api.submitScenarioResponse({
        sessionId: player.sessionId,
        playerId: player.playerId,
        scenarioId: scenario.id,
        answers: payloadAnswers,
      })
      setResult(submission)
      appendMessage({ sender: 'guide', text: submission.effectsSummary, tag: 'Outcome' })
      applyEffectsToStats(submission.effects)
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Something glitched while sending your answers.'
      setError(message)
    } finally {
      setStatus('idle')
    }
  }

  const handleSkipScenario = () => {
    setScenarioRequestId((id) => id + 1)
  }

  const choices = activePrompt?.options ?? []
  const isChoicePrompt = activePrompt?.expectedAnswerType === 'choice' && choices.length > 0

  if (!player || !sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center text-white">
        <p className="text-lg">We need your classroom code again to resume the game.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={<Wallet className="size-5 text-blue-300" />}
              label="Wealth"
              value={stats.wealth}
              tone="blue"
              format="currency"
            />
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
              {scenario?.title ?? 'Connecting to live game...'}
            </h2>
            {scenario?.estimatedTimeSeconds && (
              <p className="text-xs text-slate-400">~{scenario.estimatedTimeSeconds}s estimated</p>
            )}
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2">
            {messages.map((message) => (
              <div key={message.id} className={cn('flex', message.sender === 'player' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-lg shadow-black/20',
                    message.sender === 'player' && 'bg-blue-600 text-white',
                    message.sender === 'guide' && 'bg-slate-800 text-slate-100 border border-white/5',
                    message.sender === 'system' && 'bg-purple-700/40 text-purple-100 border border-purple-500/40',
                  )}
                >
                  {message.tag && (
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">{message.tag}</p>
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
                placeholder={activePrompt?.text ?? 'Waiting on the next scenario prompt...'}
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-transparent p-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400/60 focus:outline-none"
                disabled={!activePrompt || status === 'submitting' || status === 'fetching'}
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
                  disabled={
                    !activePrompt ||
                    status === 'submitting' ||
                    status === 'sending' ||
                    status === 'fetching' ||
                    !inputText.trim()
                  }
                >
                  {status === 'submitting' ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                  {status === 'submitting' ? 'Submitting' : 'Send'}
                </Button>
                <div className="text-xs text-slate-500">Press Enter to send • Shift + Enter for a new line</div>
              </div>

              {isChoicePrompt && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {choices.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setInputText(choice)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white transition hover:border-blue-500/40"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
        {result && (
          <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-6 text-sm text-white">
            <div className="flex items-center gap-2 text-emerald-300">
              <Sparkles className="size-4" />
              Scenario logged
            </div>
            <p className="mt-2 text-slate-100">{result.effectsSummary}</p>
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
            <Button
              className="mt-4 w-full"
              onClick={handleSkipScenario}
              disabled={status === 'fetching' || status === 'submitting'}
            >
              Load next scenario
            </Button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/20 p-3 text-sm text-rose-50">
            {error}
          </div>
        )}
      </main>
    </div>
  )
}
