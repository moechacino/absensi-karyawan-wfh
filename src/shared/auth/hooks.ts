import { useContext, useSyncExternalStore } from 'react'
import { SessionContext } from './context'

function useController() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('SessionProvider is required.')
  return session
}

export function useApi() {
  return useController().api
}

export function useSession() {
  const session = useController()
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  return {
    ...state,
    login: session.login,
    logout: session.logout,
    retry: session.retry,
    clearSession: session.clearSession,
    refreshProfile: session.refreshProfile,
  }
}
