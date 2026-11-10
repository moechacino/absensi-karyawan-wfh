# Absensi Karyawan WFH — web

React + TypeScript + Vite application for employee attendance and HR self-service.
The product task plan is in [web-tasks](../web-tasks/README.md), with the
[completion checklist](../web-tasks/index.md).

## Requirements and setup

Use Node.js 22.18+ within the 22.x line, or Node.js 24.x, and npm. `.nvmrc` pins
22.18.0 for a consistent baseline. Node 25 is outside the supported tooling range.

```sh
nvm use                 # if using nvm; install the version first if needed
npm ci
cp .env.example .env.local
npm run dev
```

Vite normally serves http://localhost:5173; use the address printed by the server.
The app now includes employee and HR routes for authentication, profile, employee and organization management, attendance, schedule and holidays. Time-off features are deferred. The local development preview is at `/dev/components`.

## Public configuration and local proxy

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` for same-origin requests, or an explicit HTTP(S) API URL ending in `/api/v1`. |
| `VITE_APP_URL` | Absolute public application URL, used later for user-initiated credential sharing. |
| `API_PROXY_TARGET` | Optional Vite development proxy target, e.g. `http://localhost:3000`. This variable has no `VITE_` prefix and is not exported into the client bundle. |

`.env.example` contains local defaults; `.env` and local override files are ignored.
Never place secrets, JWTs, passwords, signing keys, or database credentials in
`VITE_*` variables: Vite embeds them in browser assets. Missing/invalid public
configuration fails startup with the variable name and a setup instruction.
URLs cannot contain credentials, query strings, or fragments.

The dev proxy forwards `/api/v1` without rewriting the prefix. Set its target to
the API server origin; omit it when using a separately configured API origin.
Feature services use the shared Axios client. It sends browser-managed Origin and
Fetch Metadata headers; the backend configures trusted origins for CSRF separately
from CORS. The proxy's `changeOrigin` changes the upstream Host, not the browser's Origin.

Production uses built static assets and a deployment-provided `/api/v1` proxy.
SPA history fallback must not turn API errors into HTML. The development proxy
is not a production hosting configuration. Public values are build-time values;
changing deployment environment variables does not rewrite an existing bundle.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Vite development server. |
| `npm run typecheck` | Check application, tooling, and unit-test TypeScript. |
| `npm run build` | Run type checking and produce `dist/`. |
| `npm run lint` | Run ESLint with zero warnings allowed. |
| `npm test` | Run unit tests once. |
| `npm run test:watch` | Watch unit tests while developing. |
| `npm run preview` | Serve the production build locally. |

## Source conventions

```text
src/
  app/           # router, auth/query providers, and route boundaries
  features/      # auth, profile, employees, attendance, company, and HR tools
  shared/        # reusable configuration, API, UI, and domain-free utilities
    api/         # Axios client, handwritten data types, and Problem errors
    auth/        # session access hooks
    commands/    # explicit write and uncertain-result state
    query/       # private query keys, retry policy, and invalidation
    config/      # pure public-config parser and validated application values
  assets/        # local Figma SVGs, licensed WOFF2 fonts, and source manifest
  styles/        # Tailwind theme variables, font faces, and base typography
  test/          # shared unit-test setup
```

Keep unit tests beside their implementation as `*.test.ts` or `*.test.tsx`.
Discovery is limited to `src/` and excludes fixtures and build output. Tests use Vitest/jsdom; React Testing Library and jest-dom are available
for isolated component units. Shared cleanup unmounts components, restores mocks
and real timers, resets stubbed globals/env, and clears browser storage.
External services, clocks, camera, and browser features are mocked where needed.
No API integration suite, end-to-end runner, or offline queue is configured.
The configuration tests verify meaningful URL validation boundaries;
there is no template counter/sum/snapshot test.

## PWA

Production builds generate a web app manifest and service worker with
`vite-plugin-pwa`. The app supports browser installation and iOS Safari's
Share → Add to Home Screen. Icons reuse the existing Absensi brand mark.

After the first successful online visit and service worker installation, the app
shell (HTML, scripts, styles, fonts, and public icons) can start offline, including
direct visits to application routes. Login, attendance, and other server actions
still require a connection. API responses and private images are never cached by
the service worker, and writes are never queued for offline replay.

Updates wait until all app tabs/windows close before activating, so an update
does not reload an active form or attendance submission. PWA generation is disabled
in the development server. Use `npm run build` and `npm run preview` to verify the
production behavior on localhost; deployed installations require HTTPS.

## Dependency compatibility

The lockfile records the installed dependency set. Axios and TanStack Query are
the selected HTTP/server-state libraries. React Router and React Hook Form are
used for routing and forms. Tailwind's Vite plugin is configured without
adding other UI, headless, or icon libraries. React Select 5.10.2 is the
approved dropdown exception, styled through unstyled mode and Tailwind classes.

TypeScript is 5.9.3. Router 7.18.5 and jsdom 28.1.0 support the baseline Node
runtime. Vitest 5.1.0 supports Vite 8. The Axios client and handwritten data types
are in `src/shared/api/`; query policies, protected routes, and session handling
are in
`src/shared/query/`, `src/app/`, and `src/shared/auth/`.

## Design assets and theme

The [asset guide](src/assets/README.md) and
[source manifest](src/assets/asset-manifest.json) document 28 exported Figma
icons, the mark/wordmark, licensed fonts, source nodes, transformations, and
checksums. All 33 live variables match the shared design tokens. The Tailwind
theme provides semantic colors, a 4 px spacing base, 8/12/20 px radii, 48 px
touch-size utilities, 140/90 ms motion, and inspected typography sizes.

Fonts are self-hosted; runtime rendering makes no Figma/Google Fonts request.
The illustrative evidence photo stays outside production assets. Accessible
shared components and their interactions are documented in WEB-003.

## Shared components

The [component guide](src/shared/ui/README.md) documents the project-owned
Tailwind controls, dialogs, fields, local icons, search/date/file primitives,
feedback, tabs, pagination, and responsive list patterns. Feature values and
server decisions stay outside those components.

Open http://localhost:5173/dev/components on the development server for the
local component review page. It uses illustrative local data and is excluded from
production JavaScript. The automated suite remains unit tests only; the native dialog
methods are mocked in jsdom, while layout/keyboard observations are separate
manual review evidence in WEB-003.


## API requests

The [API guide](src/shared/api/README.md) covers Axios service functions,
multipart data, private file reads, and normalized errors. Request and response
interfaces are maintained by hand in `src/shared/api/models/`. Update these and
the relevant service functions when the API changes. Builds are self-contained
and do not require a sibling contract repository.

The auth provider creates one API client with the current in-memory token accessor.
The session stores only the access JWT and expiresAt in sessionStorage; draft 0.8.5
uses a one-hour stateless JWT without server-side revocation. The API client does
not read storage or implement login itself. Its Axios fetch adapter
bypasses the browser HTTP cache and blocks redirects. Backend `private, no-store`
response headers and cross-origin header exposure still require server support.
Protected API requests use the session-owned Axios client.
