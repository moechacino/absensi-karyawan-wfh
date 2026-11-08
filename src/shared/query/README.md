# Private query and command lifecycle

Create one QueryClient with createAppQueryClient. Reads retry at most twice for
network/timeout and transient HTTP failures; cancellation, auth, domain and version
failures are excluded. Retry-After seconds/date guidance takes precedence over
short exponential delay. Focus/reconnect refresh reads. Mutations use retry=false
and networkMode=always so offline commands fail rather than pausing for replay.
No Query/mutation cache or intent is persisted.

queryKeys uses ['private', identity, resource, ...filters]. Include all URL filters,
IDs, years and pagination in feature keys. invalidateGroup(client, identity, group)
refreshes attendance, employees, organization, configuration or permissions only
for that identity. Reconcile current-user permissions through the session API when
an employee/role change affects that identity.

clearAccountState synchronously disposes registered resources/commands/previews,
starts query cancellation and clears caches before awaiting cancellation. It never
clears again after awaiting, which would erase a later account's requests. Resource
hooks register cleanup with registerAccountCleanup; unregister on unmount. Session
controllers also guard generation/identity to prevent late auth/service responses.

useCommand<Input,Result> takes identity, execute(input,{idempotencyKey,signal}),
optional onConfirmed and idempotent (default true). Status is idle/submitting/
confirmed/uncertain/in-progress/conflict; result/error/refreshError are separate.
run(input) snapshots values, keeping immutable Blob/File bytes only in memory.
Double clicks share one promise; exact retries reuse the snapshot and key. Changed
input requires explicit reset(), and a reset creates a new intent/key. During an
uncertain or in-progress result keep fields locked, offer retry() or read-back,
and discard/retake only after the outcome has been resolved. No write is retried
automatically. Confirmed callbacks may invalidate read models; their failure is
refreshError and does not make the confirmed mutation replayable. Hooks reset on
identity changes and support StrictMode setup/cleanup.

usePreview<Input,Result> takes identity, execute(input,signal), optional
getExpiresAt(result). run(input) supersedes and aborts earlier work. Immediately
call invalidate() when any bound input changes; isCurrent(input) must be true
before using the result token. Responses/failures from earlier generations are
ignored, and returned expiry invalidates readiness. No independent token lifetime
is invented. Features preserve dirty fields and require renewed review after
stale-token/version conflicts. Both coordinators are functions, not classes.

Colocated units cover intent keys/snapshot identity, duplicate clicks, uncertain
retries, conflicts, cleanup, stale preview races/expiry, read policies and hook
StrictMode/account transitions with mocked services only.
