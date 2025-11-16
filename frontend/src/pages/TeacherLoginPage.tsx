import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, api, setAuthToken } from '../api'
import { persistTeacherAuth } from '../teacherAuth'
import { Button } from '../components/ui/button'

export function TeacherLoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'submitting') return
    setError(null)
    setStatus('submitting')

    try {
      const auth = await api.loginTeacher({
        email: form.email.trim(),
        password: form.password,
      })
      const expiresAt = Date.now() + auth.expiresInSeconds * 1000
      persistTeacherAuth({
        teacherId: auth.teacherId,
        token: auth.token,
        expiresAt,
        email: form.email.trim(),
      })
      setAuthToken(auth.token)
      navigate('/teacher/dashboard', { replace: true })
    } catch (loginError) {
      if (loginError instanceof ApiError) {
        let message: string | undefined
        if (typeof loginError.body === 'object' && loginError.body !== null) {
          const body = loginError.body as { message?: string; err?: string }
          message = body.message ?? body.err
        }
        setError(message ?? loginError.message ?? 'Unable to sign in with those credentials.')
      } else if (loginError instanceof Error) {
        setError(loginError.message)
      } else {
        setError('Unable to sign in. Please try again.')
      }
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div>Teacher access</div>
          <Button variant="ghost" asChild className="text-white">
            <Link to="/">← Back to home</Link>
          </Button>
        </div>
        <h1 className="mt-6 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-slate-400">Monitor progress, configure sessions, and launch new cohorts.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Email</label>
            <input
              type="email"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-blue-400/60 focus:outline-none"
              placeholder="you@school.edu"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Password</label>
            <input
              type="password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-blue-400/60 focus:outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Signing in…' : 'Log in'}
          </Button>
        </form>

        {error && <p className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/20 p-3 text-sm text-rose-100">{error}</p>}
      </div>
    </div>
  )
}
