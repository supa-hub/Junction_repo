import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ApiError, api } from '../api'
import { persistPlayerSession, type PlayerSession } from '../playerSession'
import { Button } from './ui/button'

export function JoinGamePanel() {
  const [form, setForm] = useState({ code: '', nickname: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const joinResponse = await api.joinSession(form.code.trim(), form.nickname.trim())

      const sessionPayload: PlayerSession = {
        ...joinResponse,
        nickname: form.nickname.trim(),
        classroomCode: form.code.trim(),
      }

      persistPlayerSession(sessionPayload)

      navigate(`/play/${joinResponse.sessionId}`, {
        state: { player: sessionPayload },
        replace: false,
      })
    } catch (joinError) {
      if (joinError instanceof ApiError) {
        const body = joinError.body as { message?: string } | null
        setError(body?.message ?? 'Could not join the classroom. Try again.')
      } else if (joinError instanceof Error) {
        setError(joinError.message)
      } else {
        setError('Could not join the classroom. Try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleJoin}>
      <div>
        <label className="text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
          Classroom code
        </label>
        <input
          type="text"
          value={form.code}
          onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value }))}
          placeholder="e.g. MNY-482"
          className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white placeholder:text-slate-400 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>
      <div>
        <label className="text-left text-xs font-semibold uppercase tracking-wide text-slate-300">
          Display name
        </label>
        <input
          type="text"
          value={form.nickname}
          onChange={(event) => setForm((previous) => ({ ...previous, nickname: event.target.value }))}
          placeholder="Pick a fun alias"
          className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900/70 px-4 py-3 text-white placeholder:text-slate-400 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Connecting
          </>
        ) : (
          <>
            Join session
            <ArrowRight className="size-5" />
          </>
        )}
      </Button>
      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/20 p-3 text-sm text-rose-50">
          {error}
        </div>
      )}
    </form>
  )
}
