# Shared API boundary

Types come only from the active sibling `contracts/openapi.json` (draft 0.6.0,
32 operations). Run `npm run api:generate` after a shared contract change and
review its diff. `npm run api:check` checks the facade and every generated
fragment without writing; production builds run it first. The embedded source
SHA-256 also detects contract edits that do not change TypeScript.

`schema.d.ts` exports `paths`, `components`, and `operations` through small,
type-only fragments in `generated/`. Generation limits every file to 750 lines,
including the facade. Do not edit generated output. Binary strings become Blob
(File extends Blob); default values do not make optional properties required.
An equivalent in-memory allOf/anyOf representation preserves the employee PATCH
required version and editable-field union despite openapi-typescript 7.13's
required-only anyOf behavior. The shared contract remains untouched. Conditional
rules, formats, ranges and business policy still require server/feature runtime
validation; generated types do not validate response bytes.

## Composition and typed services

Create one client during application/session composition. Its current-token
accessor avoids a dependency on React/auth features. The private Axios instance
cannot be accessed by feature code to bypass URL, auth, cache or redirect rules.

```ts
const api = createApiClient({
  baseUrl: publicConfig.apiBaseUrl,
  appOrigin: window.location.origin,
  getAccessToken: () => session.currentToken,
  onAuthenticationFailure: ({ token, error }) => session.authenticationFailed(token, error),
})

function getProfile(signal?: AbortSignal) {
  return api.request<JsonResult<'getOwnProfile'>>({ path: '/me', signal })
}

function login(input: JsonBody<'login'>) {
  return api.request<JsonResult<'login'>>({
    path: '/auth/login', method: 'POST', data: input,
  })
}
```

Import helpers from `types.ts`; imports are type-only. Services return
response.data directly, preserving list pagination; a 204 gives undefined.
Pass Query's AbortSignal to `signal`. `idempotencyKey` sends a caller-owned
Idempotency-Key for operations declaring it. This layer never generates a key,
retries a write, refreshes credentials, or claims mutation success on upload.
Timeout is optional and feature-owned; none is imposed globally.

Paths are relative to /api/v1 and start with one slash. Put query values in
`params`; encode resource path segments. Absolute URLs, query/fragment-bearing
paths, traversal and encoded separators fail before reading a token or invoking
transport. Even same-origin absolute URLs are rejected. The configured API
origin/base path stays fixed; redirects fail before credentials/body can follow.

The accessor supplies the current token on each request. Login is anonymous even
if an old token remains; `auth: 'none'` explicitly omits authentication. Only a
token-bearing HTTP 401 for the still-current token invokes session cleanup.
Invalid login, permission/CSRF 403 and old-session failures cannot clear a later
identity. Session persistence and expiry belong to the auth layer.

## Browser transport and cache policy

The public API remains Axios. Its fetch adapter uses browser transport with
`cache: 'no-store'` and `redirect: 'error'`. Axios withCredentials=false omits
cookies; XSRF cookie/header support is disabled. No browser Origin/Fetch Metadata
or CSRF-token headers are fabricated. Backend trusted-origin and CORS policies
remain server responsibilities.

The contract also requires Cache-Control private/no-store on private responses,
credentials and file bytes. This client bypasses browser HTTP caching in addition
to that server rule, with no service worker/persistence. TanStack Query's private
in-memory lifecycle belongs to the query/session layer. A separate API origin
must expose X-Request-Id and Retry-After through CORS for the browser to read
them; these header values are optional when unavailable.

## Multipart and authenticated image bytes

`toFormData` supports the two active generated bodies: checkIn and updateEmployee.
It preserves binary Blob/File data and filenames, omits null/undefined optional
parts, and stringifies validated scalar values without trimming strings or
losing false/zero. Nonfinite numbers are rejected. `versionText` converts only
nonnegative safe integers, without scientific notation or rounding.

```ts
const body: MultipartBody<'updateEmployee'> = {
  expectedVersion: versionText(validatedVersion), fullName: validatedFullName,
}
return api.request<JsonResult<'updateEmployee'>>({
  path: `/hr/employees/${encodeURIComponent(employeeId)}`, method: 'PATCH',
  data: toFormData(body), idempotencyKey: intentKey,
})
```

Employee PATCH remains multipart even without a photo. Features validate editable
fields, photo/removal conflicts and server MIME/size policy. There is no JSON
payload wrapper, string null, base64, preliminary upload or separate file ID.
The client locks out default JSON/form Content-Type so the browser supplies the
multipart boundary.

`api.readFile(metadata, { signal })` requires a matching FileMetadata id and exact
/api/v1/files/{id} contentPath, returns an authenticated image Blob, and rejects
external/mismatched/token-bearing metadata before transport. Active files are
profile/check-in images only. Object URL lifetime, image UI and download cleanup
are owned by the file feature. Time-off/PDF services and generated expectations
are deferred; no signed URL, public file URL, S3 or independent upload exists.

## Function-based errors

`createApiError(kind, metadata)` creates a safe standard Error with typed fields;
`isApiError(value)` is its guard. `ApiError` is a TypeScript interface, not a
custom Error class. `normalizeApiError` preserves already-normalized failures.
Kinds distinguish HTTP, network, timeout, cancellation and configuration errors.
HTTP failures keep actual status, validated Problem (code, field errors, details),
request ID and raw Retry-After. Header correlation ID takes precedence over the
Problem fallback. JSON error blobs are parsed; malformed JSON, HTML and other
bytes receive a safe fallback.

Raw Axios config, request headers/bodies, passwords, tokens, private bytes,
transport messages and causes are not retained/logged. Map stable Problem codes
and field errors in feature UI. `retryAfterMs` converts seconds or an HTTP date;
it does not schedule a retry. Cancellation, connection loss and timeout do not
prove rollback. Reconciliation and intent/preview state belong to WEB-005.

Units mock the Axios adapter and unsupported Blob.text browser primitive. They
make no network requests and do not establish backend authorization, CSRF/CORS,
no-store responses or actual image streaming behavior.
