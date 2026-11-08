# API client

This folder holds the generated API types and one Axios client.

## Keep types current

`schema.d.ts` and the files in `generated/` come from `../contracts/openapi.json`.
After a contract change, run:

```sh
npm run api:generate
npm run api:check
```

The build runs `api:check` automatically. Do not edit generated files by hand.
The generated types describe expected data; they do not validate server replies.

## Make a request

Get the shared client with `useApi()` in a feature service, then send a relative
path. Pass TanStack Query's signal through so a cancelled query stops its request.
The client returns the response body directly. A 204 response returns `undefined`.

```ts
export function getHome(api: ApiClient, signal?: AbortSignal) {
  return api.request<JsonResult<'getEmployeeHome'>>({
    path: '/me/home',
    signal,
  })
}
```

`JsonBody`, `MultipartBody`, and `JsonResult` list the request and response types
for each operation in `types.ts`. For example, `JsonBody<'login'>` is the login
form. These names are based on the OpenAPI operation ID.

The client reads the current JWT through a function supplied by the session.
Login is anonymous. Other requests use the current token. A 401 for that same
token notifies the session; a login 401 or a 403 does not. Logout and password
changes clear session state in the auth feature.

## Multipart requests

Use `toFormData` for the two active file uploads: check-in photo and employee
profile photo. It keeps Blob bytes, omits null/undefined values, and writes
strings, booleans, and numbers as text. Use `versionText` for the employee
multipart version field. The client leaves the multipart Content-Type boundary
to the browser.

```ts
const data = toFormData<MultipartBody<'checkIn'>>({ photo })
return api.request<JsonResult<'checkIn'>>({
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
