import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { publicConfig } from '../config'
import { clearAccountState } from '../query/cleanup'
import { createSessionController } from '../../features/auth/sessionController'
import { SessionContext } from './context'

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [session] = useState(() =>
    createSessionController({
      baseUrl: publicConfig.apiBaseUrl,
      appOrigin: window.location.origin,
      storage: () => window.sessionStorage,
      cleanup: () => {
        void clearAccountState(queryClient)
      },
    }),
  )

  useEffect(() => {
    session.start()
    const resume = () => {
      if (document.visibilityState !== 'hidden') session.recheck()
    }
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      session.stop()
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [session])

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
}
