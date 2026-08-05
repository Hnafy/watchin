# localStorage Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all cookie-based auth with localStorage-based auth (tokens sent via `Authorization: Bearer` header) so the Vercel cookie/CORS/SameSite problem is eliminated.

**Architecture:** The server stops setting/reading cookies: `login`/`register` return tokens in the JSON body, `refresh`/`logout` read the refresh token from the request body, and the auth middleware reads only the Bearer header. The client stores both tokens in localStorage, attaches them as an `Authorization` header via an axios request interceptor, and refreshes on 401 using the stored refresh token.

**Tech Stack:** Express (server), axios + zustand + react-query (client). TypeScript throughout.

**Testing note:** Neither project has a test framework installed (confirmed: no `*.test.ts`/`*.spec.ts`, no test runner in `package.json`). Per repo convention, verification is `typecheck` + `build` + grep assertions + manual dev checks. Do NOT introduce a test framework in this plan.

**Repo state at plan time:** `git status` clean; HEAD = `51a78ef` (design spec) on top of `c792d09 fix cookie`. `client/src/services/api.ts` has `API_URL = 'https://watchin-4crs.vercel.app/api'` active, `withCredentials: true`, and a cookie-based refresh interceptor. `client/vercel.json` already has the `/api` rewrite. Commands in this plan run from `server/` or `client/` as noted.

---

### Task 1: Server — return auth tokens in response body, remove all cookie code

**Files:**
- Modify: `server/src/controllers/authController.ts` (full rewrite)

- [ ] **Step 1: Rewrite `authController.ts`**

Replace the entire contents of `server/src/controllers/authController.ts` with:

```ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { AppError } from '../utils/AppError.js';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.login(req.body);
      res.json({
        status: 'success',
        user: { id: user.id, email: user.email, username: user.username, role: user.role, avatar: user.avatar },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken;
      if (!refreshToken) throw AppError.unauthorized('Refresh token required');

      const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);
      res.json({ status: 'success', accessToken, refreshToken: newRefreshToken });
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken;
      if (refreshToken) await authService.logout(refreshToken);
      res.json({ status: 'success', message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe((req as any).user.id);
      if (!user) throw AppError.notFound('User not found');
      res.json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  },
};
```

This removes `authCookieOptions`, `setAuthCookies`, `clearAuthCookies`,
`ACCESS_TOKEN_MAX_AGE`, `REFRESH_TOKEN_MAX_AGE`, and every `res.cookie` /
`res.clearCookie` / `req.cookies` reference. The `Response` import is still used
by the handler signatures.

- [ ] **Step 2: Typecheck the server**

Run (in `server/`):
```bash
npm run typecheck
```
Expected: completes with no errors (exit 0). If there is an unused import
error for `Response`, keep it — it is used by the handler signatures.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/authController.ts
git commit -m "refactor: return auth tokens in response body"
```

---

### Task 2: Server — auth middleware reads Bearer token only

**Files:**
- Modify: `server/src/middleware/authMiddleware.ts:20`
- Modify: `server/src/middleware/authMiddleware.ts:59`

- [ ] **Step 1: Remove the cookie fallback in `authenticate`**

In `server/src/middleware/authMiddleware.ts`, change line 20 from:

```ts
    const token = extractTokenFromHeader(req.headers.authorization) || req.cookies?.accessToken;
```

to:

```ts
    const token = extractTokenFromHeader(req.headers.authorization);
```

- [ ] **Step 2: Remove the cookie fallback in `optionalAuth`**

Change line 59 (inside `optionalAuth`) from:

```ts
    const token = extractTokenFromHeader(req.headers.authorization) || req.cookies?.accessToken;
```

to:

```ts
    const token = extractTokenFromHeader(req.headers.authorization);
```

- [ ] **Step 3: Typecheck the server**

Run (in `server/`):
```bash
npm run typecheck
```
Expected: no errors (exit 0).

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/authMiddleware.ts
git commit -m "refactor: auth middleware reads bearer token only"
```

---

### Task 3: Server — verify no cookie usage remains and build

**Files:**
- Verify: `server/src/**/*.ts` (no file changes expected)

- [ ] **Step 1: Grep for any remaining cookie usage**

Run (in `server/`):
```bash
rg -n "req\.cookies|res\.cookie|res\.clearCookie|cookie\(|Cookies\?|authCookieOptions|setAuthCookies|clearAuthCookies" src
```
Expected: no matches. The only remaining `cookie` reference is
`cookie-parser` in `src/app.ts:3` and `src/app.ts:38`, which the design
deliberately leaves in place (harmless). Confirm with:
```bash
rg -n "cookie" src
```
Expected output: exactly `src/app.ts:3` and `src/app.ts:38`.

- [ ] **Step 2: Build the server**

Run (in `server/`):
```bash
npm run build
```
Expected: `tsc` emits to `dist/` with no errors (exit 0).

- [ ] **Step 3: Commit (if grep found anything to fix)**

Only if Step 1 found stray matches — fix them first, then:
```bash
git add server/src
git commit -m "fix: remove stray cookie usage"
```
Otherwise no commit for this task.

---

### Task 4: Client — localStorage token storage, Bearer header, body-based refresh

**Files:**
- Modify: `client/src/services/api.ts:1-45` (axios setup + interceptors)
- Modify: `client/src/services/api.ts:52` (`authApi.logout`)

- [ ] **Step 1: Add token helpers and rewrite the axios setup + interceptors**

In `client/src/services/api.ts`, replace lines 1-45 (from the imports through the end of the response interceptor `});`) with:

```ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_URL = 'https://watchin-4crs.vercel.app/api';
// export const API_URL = '/api';

const ACCESS_TOKEN_KEY = 'watchin_accessToken';
const REFRESH_TOKEN_KEY = 'watchin_refreshToken';

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (r: unknown) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        setTokens(data.accessToken, data.refreshToken);
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        processQueue(refreshError as Error);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

Notes:
- `withCredentials: true` is removed (no cookies anymore).
- `config.headers.set(...)` is the type-safe axios v1 method (headers is an `AxiosHeaders`).
- On a 401 with no stored refresh token, or a failed refresh, the tokens are cleared so the user is force-logged-out.
- The token helpers are exported so `useAuth.ts` can save/clear them.

- [ ] **Step 2: Send the refresh token in the logout body**

In `client/src/services/api.ts`, change line 52 from:

```ts
  logout: () => api.post('/auth/logout'),
```

to:

```ts
  logout: () => api.post('/auth/logout', { refreshToken: getRefreshToken() }),
```

- [ ] **Step 3: Typecheck the client**

Run (in `client/`):
```bash
npm run typecheck
```
Expected: no errors (exit 0).

- [ ] **Step 4: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: store tokens in localStorage and attach bearer header"
```

---

### Task 5: Client — save/clear tokens on auth mutations

**Files:**
- Modify: `client/src/hooks/useAuth.ts:27-40`

- [ ] **Step 1: Update the import**

In `client/src/hooks/useAuth.ts`, change line 3 from:

```ts
import { authApi } from '../services/api';
```

to:

```ts
import { authApi, setTokens, clearTokens } from '../services/api';
```

- [ ] **Step 2: Save tokens after login and register**

Replace lines 27-40 (the three `useMutation` blocks) with:

```ts
  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => authApi.login(data),
    onSuccess: (r) => {
      setTokens(r.data.accessToken, r.data.refreshToken);
      useAuthStore.getState().setUser(r.data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; username: string; password: string }) => authApi.register(data),
    onSuccess: (r) => {
      setTokens(r.data.accessToken, r.data.refreshToken);
      useAuthStore.getState().setUser(r.data.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearTokens();
      useAuthStore.getState().logout();
      qc.invalidateQueries();
    },
  });
```

Note: `logout` uses `onSettled` (not `onSuccess`) so the local session clears even
if the network request fails — the user must always be able to log out locally.
This is a small robustness improvement over the design doc's `onSuccess`.

- [ ] **Step 3: Typecheck the client**

Run (in `client/`):
```bash
npm run typecheck
```
Expected: no errors (exit 0).

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useAuth.ts
git commit -m "feat: save and clear tokens on auth mutations"
```

---

### Task 6: Client — final verification and manual test

**Files:**
- Verify: `client/src/**/*.ts`, `client/src/**/*.tsx` (no file changes expected)

- [ ] **Step 1: Grep for remaining cookie / credentials references**

Run (in `client/`):
```bash
rg -n "withCredentials|document\.cookie|req\.cookies|auth-cookie|accessToken.*cookie" src
```
Expected: no matches (the `footer.cookies` i18n string in
`src/i18n/dictionaries/en.ts:115` and the `useSearch.ts` localStorage keys are
unrelated and allowed).

- [ ] **Step 2: Build the client**

Run (in `client/`):
```bash
npm run build
```
Expected: `tsc -b && vite build` completes, `dist/` is emitted (exit 0).

- [ ] **Step 3: Manual verification in dev**

Start both servers in two terminals:
```bash
# terminal 1 (server/)
npm run dev
# terminal 2 (client/)
npm run dev
```

Then in the browser:
1. Open the client dev URL, log in with a valid account.
2. DevTools → Application → Local Storage → the site origin: expect
   `watchin_accessToken` and `watchin_refreshToken` keys with JWT values.
   DevTools → Network → `/auth/login` response body: expect
   `accessToken` and `refreshToken` fields (no `set-cookie` header).
3. Reload the page — session persists (user still logged in; `getMe` runs with
   the Bearer header).
4. Open DevTools → Network, confirm every `/api/*` request sends
   `Authorization: Bearer <token>`.
5. To force a refresh: in DevTools Console overwrite
   `localStorage.watchin_accessToken = 'garbage'`, then navigate the app.
   Expect a 401 → automatic `/auth/refresh` → retry succeeds → a new valid
   access token is stored.
6. Click logout. Confirm `watchin_accessToken` / `watchin_refreshToken` are
   removed from Local Storage and the user is returned to the logged-out state.

- [ ] **Step 4: Commit (only if a stray match was fixed in Step 1)**

```bash
git add client/src
git commit -m "fix: remove stray cookie references"
```

---

## Final Cross-Check

- [ ] `git log --oneline -8` shows one commit per task above.
- [ ] `server`: `npm run typecheck` and `npm run build` pass.
- [ ] `client`: `npm run typecheck` and `npm run build` pass.
- [ ] `rg -n "cookie" server/src` → only `app.ts:3` and `app.ts:38`.
- [ ] `rg -n "withCredentials" client/src` → no matches.
- [ ] Login stores both tokens in localStorage; logout clears them; refresh-on-401 works.
