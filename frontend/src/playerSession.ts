import type { JoinGameResponse } from './api'

export type PlayerSession = JoinGameResponse & {
  nickname: string
  classroomCode: string
}

const storageKey = (sessionId: string) => `player-session-${sessionId}`

export function persistPlayerSession(session: PlayerSession) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(session.sessionId), JSON.stringify(session))
  } catch (error) {
    console.warn('Unable to persist player session', error)
  }
}

export function loadPlayerSession(sessionId: string): PlayerSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId))
    if (!raw) return null
    return JSON.parse(raw) as PlayerSession
  } catch (error) {
    console.warn('Unable to load player session', error)
    return null
  }
}

export function clearPlayerSession(sessionId: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(storageKey(sessionId))
  } catch (error) {
    console.warn('Unable to clear player session', error)
  }
}
