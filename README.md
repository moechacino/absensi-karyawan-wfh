# Absensi Karyawan WFH — web

React + TypeScript + Vite application for employee attendance and HR self-service.
The product task plan is in [web-tasks](../web-tasks/README.md), with the
[completion checklist](../web-tasks/index.md) maintained after user review.

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
The current page is a minimal application entry. Authentication, API operations,
Figma assets, and the design theme are implemented by subsequent tasks.

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
The scaffold makes no API calls. When API integration is implemented, the
backend must configure the browser origin for CSRF trust independently of CORS.
The proxy's `changeOrigin` changes the upstream Host, not the browser's Origin.

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
  app/           # application composition and providers; routes added later
  features/      # product capabilities, introduced by their own task
  shared/        # reusable configuration, API, UI, and domain-free utilities
    config/      # pure public-config parser and validated application values
  styles/        # Tailwind import; Figma theme/font setup follows in WEB-002
  test/          # shared unit-test setup
```

Keep unit tests beside their implementation as `*.test.ts` or `*.test.tsx`.
Discovery is limited to `src/` and excludes fixtures, generated content, and build
output. Tests use Vitest/jsdom; React Testing Library and jest-dom are available
for isolated component units. Shared cleanup unmounts components, restores mocks
and real timers, resets stubbed globals/env, and clears browser storage.
External services, clocks, camera, and browser features are mocked where needed.
No API integration suite, end-to-end runner, service worker, or offline queue is
configured. The configuration tests verify meaningful URL validation boundaries;
there is no template counter/sum/snapshot test.

## Dependency compatibility

The lockfile records the installed dependency set. Axios and TanStack Query are
the selected HTTP/server-state libraries. React Router and React Hook Form are
installed for their later tasks. Tailwind's Vite plugin is configured without
adding a UI, headless, or icon library.

TypeScript is 5.9.3 because `openapi-typescript` 7.13.0 declares a TypeScript 5
peer requirement; the starter's TypeScript 6 range was incompatible with that
requirement. Router 7.18.5 and jsdom 28.1.0 support the baseline Node runtime.
Vitest 5.1.0 supports Vite 8. OpenAPI generation, request clients, query policies,
protected routes, and authentication are intentionally owned by later tasks.
