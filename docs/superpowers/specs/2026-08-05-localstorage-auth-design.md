# localStorage Auth Design

**Date:** 2026-08-05
**Status:** Approved by user (verbal)

## Goal

Replace all cookie-based auth with localStorage-based auth. The browser stores
JWT access/refresh tokens in localStorage and sends them via the
`Authorization` header. This eliminates the Vercel cookie/CORS/SameSite pain
entirely: requests stay cross-origin (frontend -> backend) but no cookies are
involved, so no `Set-Cookie`, no `withCredentials`, and no CORS credential rules
are needed.

## Accepted Tradeoff

JWT in localStorage is readable by any XSS script (HttpOnly cookies were the
reason we previously avoided this). The user explicitly chose localStorage to
remove the Vercel cookie problems. Documented here for awareness, not changed.

## Server Changes

### `server/src/controllers/authController.ts`
- `register`: return `{ status, user, accessToken, refreshToken }` in the JSON
  body. Remove `setAuthCookies(res, ...)`.
- `login`: same — return tokens in the body. Remove `setAuthCookies`.
- `refresh`: read `req.body.refreshToken` (throw `AppError.unauthorized` if
  missing). Return `{ status, accessToken, refreshToken }` in the body. Remove
  `setAuthCookies`.
- `logout`: read `req.body.refreshToken`; delete the stored token via
  `authService.logout(refreshToken)`; return `{ status: 'success' }`. Remove
  `clearAuthCookies`.
- Delete the `authCookieOptions` / `setAuthCookies` / `clearAuthCookies`
  helpers and the `ACCESS_TOKEN_MAX_AGE` / `REFRESH_TOKEN_MAX_AGE` constants.

### `server/src/middleware/authMiddleware.ts`
- `authenticate` and `optionalAuth`: read token from
  `extractTokenFromHeader(req.headers.authorization)` only. Remove the
  `req.cookies?.accessToken` fallback.

No other server files change. `cookie-parser` middleware registration may remain
(no longer used, harmless) — not removed to minimize churn.

## Client Changes

### `client/src/services/api.ts`
- Add token helpers (module-local functions using localStorage):
  - keys `watchin_accessToken`, `watchin_refreshToken`
  - `getAccessToken()` / `getRefreshToken()` / `setTokens(access, refresh)` /
    `clearTokens()`
- Remove `withCredentials: true` from the axios instance.
- Add a request interceptor: if `getAccessToken()` exists, set
  `config.headers.Authorization = 'Bearer <token>'`.
- Response interceptor (401 flow): use `getRefreshToken()` and
  `POST /auth/refresh` with body `{ refreshToken }`. On success
  `setTokens(r.data.accessToken, r.data.refreshToken)` and retry the original
  request. On failure `clearTokens()` and reject. Keep the existing
  `isRefreshing` / `failedQueue` single-flight logic.
- `authApi.logout`: send `{ refreshToken: getRefreshToken() }` in the body.

### `client/src/hooks/useAuth.ts`
- `loginMutation.onSuccess`: `setTokens(r.data.accessToken, r.data.refreshToken)`
  then `setUser(r.data.user)`.
- `registerMutation.onSuccess`: same.
- `logoutMutation.onSuccess`: `clearTokens()` then store `logout()` then
  `qc.invalidateQueries()`.

### `client/src/store/authStore.ts`
- No change (user object still persisted via zustand).

## Data Flow

1. **Login:** client `POST /auth/login` -> server returns
   `{ user, accessToken, refreshToken }` -> client saves tokens to localStorage,
   sets user in store.
2. **Authenticated requests:** request interceptor adds `Authorization: Bearer`
   -> server `authenticate` verifies -> protected route.
3. **Expired access token:** response 401 -> interceptor refreshes with
   localStorage refreshToken -> stores new tokens -> retries original request.
4. **Logout:** client sends refreshToken in body -> server deletes stored token
   -> client clears localStorage and store.

## Error Handling

- Missing refreshToken on `/auth/refresh` or `/auth/logout`: 401 (`AppError.unauthorized`).
- Refresh failure: client clears tokens; user stays logged out; next `getMe`
  in `useAuth` runs with no token and `logout()` clears the persisted store.

## Verification

- `server`: `npm run typecheck` and `npm run build`.
- `client`: `npm run build` (tsc + vite).
- Grep `server/src` for `cookie` / `Cookies` — expect only `cookie-parser`
  registration remaining.
- Manual: login in dev (vite proxy) -> token saved to localStorage -> refresh
  page keeps session -> protected call works -> logout clears tokens.
