# Web deployment notes

## Build and host

Use the Node version in `.nvmrc`, install from the lockfile, then run `npm run build`. The build first checks generated API types against the sibling `contracts/openapi.json`, then type-checks and writes static files to `dist/`.

The client-side router needs a history fallback to `index.html` for application routes such as `/app/attendance` and `/hr/employees`. Keep `/api/v1/*` excluded from that fallback so API errors never become an HTML application response. The current Figma component review route is development-only.

Prefer serving the web app and API on one HTTPS origin, with `/api/v1` routed to the API. For local development, Vite can proxy `/api/v1` by setting `API_PROXY_TARGET` to the API origin. The proxy preserves the path. `VITE_API_BASE_URL` is public build-time configuration and must end in `/api/v1`; `VITE_APP_URL` is the absolute app URL used in user-controlled employee access instructions. Neither may contain secrets.

## Browser security and files

The API relies on browser-managed Origin and Fetch Metadata headers for CSRF checks. The backend must configure trusted origins separately from CORS when the API origin differs. Cross-origin deployments must allow the required request headers and expose `X-Request-Id` and `Retry-After` if the UI should read them.

Use HTTPS for camera access outside localhost. Private profile/check-in images are fetched through the authenticated file-content endpoint, then displayed through temporary Blob object URLs. The backend must return `Cache-Control: private, no-store`; the web app does not store private resources in a service worker. Configure image content types, file authorization, and history fallback on the hosting/API layers.

The active contract is draft 0.7.0. Web behavior, generated types, backend handlers, CORS/CSRF settings, and local file delivery must be checked together when the contract changes. Schedule and holiday previews are advisory and token-free; saves revalidate server state. Time off, JWT revocation, audit writes, last-active-HRD protection, and persistent file-cleanup workers are deferred by the current contract.

## Verification limits

Automated coverage is isolated unit tests with mocked API/browser objects. It does not verify an actual server, production CORS/CSRF policy, camera hardware, filesystem durability, or deployed route fallback. Keep those operational checks with the release owner; this repository does not include an end-to-end/browser runner.
