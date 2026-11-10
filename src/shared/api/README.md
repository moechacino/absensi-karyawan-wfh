# API client

This folder holds a regular Axios client and handwritten request/response interfaces.
Feature services call the client with explicit URLs, HTTP methods, and request data.

The active contract is OpenAPI 0.8.5, covering the 32 requests in the live API
collection. Employee creation and information updates use multipart (also when
no photo is selected). Role changes use a separate JSON PUT with numeric
`expectedVersion` and boolean `confirmHrAccess`; information updates send the
version as decimal form text and never include a role or password.

Employee creation and information updates retain their idempotency key and
original fields/file across uncertain retries. Role changes have no idempotency
key: the UI reads the latest employee after an uncertain outcome before allowing
another confirmed write. A version conflict preserves local inputs for review.
Photo removal remains proposed in the API documentation and is not exposed.

Schedules send `opensMinutesBeforeStart` as an integer from 0 to 1440; new forms
default to 15 and existing versions retain their own allowance. Preview and save
send the same value. Attendance uses the server's `canCheckIn`, `canCheckOut`, and
absolute check-in window rather than calculating eligibility from the device clock.
Home, attendance details, and monitoring refresh at check-in window and checkout deadline boundaries.

Home and attendance timestamps display in the device timezone. Date-only work
dates remain business calendar labels. An overnight record keeps its starting
work date. `MISSED_CHECK_OUT` is a terminal record state with null check-out/duration;
the UI shows a warning and prevents checkout retries after that server rejection.
Checkout remains available after planned end until the server's `checkOutDeadlineAt`,
the next working shift's check-in opening (rest days/holidays skipped). The client
never derives that cutoff from planned end or computes the next working date.
`checkOutPunctuality` displays EARLY/ON_TIME/LATE independently of check-in
punctuality; `earlyCheckOutSeconds` displays early departure duration. The original
attendance ID and expected version are sent on checkout, including late checkout.
Monitoring supports its status filter and `missedCheckOut` summary count. No
checkout grace-period setting is exposed.

## Data types

`types.ts` exports plain interfaces from `models/`, grouped into common data,
accounts, calendar, and attendance. Maintain these alongside feature requests
when API behavior changes. There is no code generation, operation-ID lookup, or
build dependency on an OpenAPI file. TypeScript types do not validate server replies.

## Make a request

Get the shared client with `useApi()` in a feature service, then send a relative
path. Pass TanStack Query's signal through so a cancelled query stops its request.
The client returns the response body directly. A 204 response returns `undefined`.

```ts
export function getHome(api: ApiClient, signal?: AbortSignal) {
  return api.request<Home>({
    path: '/me/home',
    signal,
  })
}
```

The client reads the current JWT through a function supplied by the session.
Login is anonymous. Other requests use the current token. A 401 for that same
token notifies the session; a login 401 or a 403 does not. Logout and password
changes clear session state in the auth feature.

## Multipart requests

Use `toFormData` for employee creation, employee profile updates, and check-in,
including employee requests without a photo. It keeps Blob bytes, omits null/undefined values, and writes
strings, booleans, and numbers as text. Use `versionText` for the employee
multipart version field. The client leaves the multipart Content-Type boundary
to the browser.

```ts
const body: CheckInInput = { photo }
const data = toFormData(body)
return api.request<Attendance>({
  path: '/me/attendances/check-in',
  method: 'POST',
  data,
  idempotencyKey,
  signal,
})
```

`api.readFile(metadata, signal)` fetches the authorized image bytes as a Blob.
It checks that the metadata ID matches `/api/v1/files/{id}` before sending.

## Errors

Requests reject with a plain `ApiError`. Check `error.kind` for network, timeout,
cancellation, configuration, or HTTP failures. For an HTTP failure, use
`error.problem?.code` for feature behavior and `error.problem?.errors` for field
messages. `requestId` and `retryAfter` are available when supplied by the server.
Use `retryAfterMs` only when a feature needs to display or schedule its own wait;
the client never retries a write.

Timeouts and cancellations do not tell us whether a write reached the server.
The shared command helper keeps the same input and idempotency key for a deliberate
retry. The client does not log requests, passwords, tokens, or file bytes.
