import type { QueryClient } from '@tanstack/react-query'

const cleanups = new Set<() => void>()

export function registerAccountCleanup(cleanup: () => void): () => void {
  cleanups.add(cleanup)
  return () => {
    cleanups.delete(cleanup)
  }
}

/** All sensitive resources disappear synchronously before cancellation is awaited. */
export async function clearAccountState(client: QueryClient): Promise<void> {
  for (const cleanup of [...cleanups]) {
    try {
      cleanup()
    } catch {
      /* One resource must not prevent remaining cleanup. */
    }
  }
  const cancellation = client.cancelQueries()
  client.clear()
  await cancellation
}
