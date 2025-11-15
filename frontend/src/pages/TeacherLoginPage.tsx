import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

export function TeacherLoginPage() {
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

        <form className="mt-8 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Email</label>
            <input
              type="email"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-blue-400/60 focus:outline-none"
              placeholder="you@school.edu"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400">Password</label>
            <input
              type="password"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white focus:border-blue-400/60 focus:outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>

        <div className="mt-4">
          <Button variant="outline" className="w-full border-white/20 text-white" asChild>
            <Link to="/teacher/dashboard">Preview live dashboard</Link>
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Need an instructor account? <span className="text-white">Contact the SupaHub team.</span>
        </p>
      </div>
    </div>
  )
}
