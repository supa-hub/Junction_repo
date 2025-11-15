export interface TeacherAuthSession {
  teacherId: string
  token: string
  expiresAt: number
  email: string
}

const STORAGE_KEY = 'teacher-auth'

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function persistTeacherAuth(session: TeacherAuthSession) {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch (error) {
    console.warn('Unable to persist teacher auth session', error)
  }
}

export function loadTeacherAuth(): TeacherAuthSession | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TeacherAuthSession
    if (!isTeacherAuthValid(parsed)) {
      storage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch (error) {
    console.warn('Unable to load teacher auth session', error)
    return null
  }
}

export function clearTeacherAuth() {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Unable to clear teacher auth session', error)
  }
}

export function isTeacherAuthValid(auth: TeacherAuthSession | null): auth is TeacherAuthSession {
  if (!auth) return false
  return auth.expiresAt > Date.now()
}
