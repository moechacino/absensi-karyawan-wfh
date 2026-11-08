import { createContext } from 'react'
import type { createSessionController } from '../../features/auth/sessionController'

export type SessionController = ReturnType<typeof createSessionController>
export const SessionContext = createContext<SessionController | null>(null)
