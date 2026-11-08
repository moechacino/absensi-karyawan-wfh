import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './keys'

export type InvalidationGroup =
  | 'attendance'
  | 'employees'
  | 'organization'
  | 'configuration'
  | 'permissions'
const groups: Record<InvalidationGroup, readonly string[]> = {
  attendance: ['home', 'attendance', 'monitoring'],
  employees: ['employees', 'profile', 'home', 'monitoring'],
  organization: ['organization', 'employees', 'profile', 'monitoring'],
  configuration: [
    'schedule',
    'schedule-versions',
    'holidays',
    'home',
    'attendance',
    'monitoring',
  ],
  permissions: ['profile', 'employees', 'organization', 'monitoring'],
}

export async function invalidateGroup(
  client: QueryClient,
  identity: string,
  group: InvalidationGroup,
): Promise<void> {
  await Promise.all(
    groups[group].map((name) =>
      client.invalidateQueries({
        queryKey: queryKeys.resource(identity, name),
      }),
    ),
  )
}
