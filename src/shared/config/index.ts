import { readPublicConfig } from './environment'

export const publicConfig = readPublicConfig(import.meta.env)
