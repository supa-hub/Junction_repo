import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { JoinGamePanel } from '../components/JoinGamePanel'
import { Button } from '../components/ui/button'

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      <div className="absolute right-6 top-6 z-20">
        <Button
          variant="outline"
          size="default"
          className="border-white/40 px-4 py-2 text-sm text-white"
          asChild
        >
          <Link to="/teacher">Teacher login</Link>
        </Button>
      </div>
      <div className="relative z-10 flex min-h-screen items-center px-4 py-6">
        <div className="w-full max-w-6xl space-y-8">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="space-y-4 text-center md:text-left">
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-500/40 bg-purple-600/20 px-4 py-2 text-sm text-purple-100 md:justify-start">
                Financial Literacy Game
              </div>
              <h1 className="font-heading text-[clamp(2.5rem,5vw,4rem)] leading-tight text-white">Money Masters</h1>
              <p className="mx-auto max-w-3xl text-base text-slate-200 md:mx-0">
                A 45-minute classroom simulation where students juggle wealth, health, and happiness in real time while teachers monitor the room from a live dashboard.
              </p>
            </div>

            <div className="group relative rounded-3xl border border-blue-500/40 bg-blue-600/20 p-6 text-left shadow-2xl shadow-blue-900/30">
              <div className="absolute -top-3 right-6 rounded-full border border-slate-900 bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                STUDENT
              </div>
              <div className="mb-4 inline-flex rounded-full bg-blue-700/60 p-4">
                <Users className="size-10 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Join Game</h2>
              <p className="text-slate-100">
                Enter your classroom code to jump into the current session and compete with your peers.
              </p>
              <JoinGamePanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
