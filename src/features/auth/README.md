# Session composition

`SessionProvider` belongs inside the single QueryClientProvider. Consumers import
`useSession` and `useApi` from `shared/auth`. The provider creates one private API
client; its token accessor reads in-memory state on each request. Login uses the
server's returned profile, while reload restoration must first validate GET /me.

Only `{version:1, accessToken, expiresAt}` is stored under
`absensi-wfh.session.v1` in sessionStorage. Profiles, permissions, credentials,
password fields, query caches, file bytes, and pending commands are never stored.
Malformed/expired records are removed; extra persisted properties are stripped.
Storage failure is exposed and never falls back to localStorage.

Session status is loading, authenticated, anonymous, or error. A transient /me
failure or a 403 keeps the stored record while hiding protected content. Retry
is explicit. Login credentials are used exactly as supplied; new-password policy
belongs to the separate password-change form. Initial-password accounts receive
normal role-based access plus the nonblocking layout warning.

Login expiry uses the earlier of returned expiresIn and expiresAt - serverNow,
measured against the local issuance time. This accommodates device clock skew
during that session. A reload has only persisted absolute expiry available;
server authentication remains authoritative. Focus/visibility resume rechecks
the local deadline, and authenticated 401 clears the still-current session.

Every identity transition aborts session requests, increments a generation guard,
and runs shared account cleanup before exposing another identity. Logout starts
server revocation with the old token and clears local/private state immediately,
even when the revocation request fails. No automatic refresh or write replay
exists. Browser storage removal can itself fail; that is shown as a controlled
storage error rather than a claim that browser persistence was erased.

`refreshProfile()` supports explicit profile/policy reload. `clearSession()` is
used after confirmed password change or deliberate recovery from an uncertain
change. Login only honors validated active internal return routes. Fixed query
messages `password-changed` and `password-uncertain` contain no password/token.

Unit tests replace Axios transport, clock, storage, auth hooks and navigation;
they do not exercise a real API or full-app route journey. Backend token
revocation, authorization, CSRF/CORS and cookie behavior remain server concerns.
