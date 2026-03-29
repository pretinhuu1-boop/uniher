/**
 * Fetch interceptor + Activity-based session management:
 * 1. Tracks user activity (click, scroll, keydown)
 * 2. Auto-refreshes token silently while user is active
 * 3. After 15min of inactivity → shows reauth modal
 * 4. On 401 → tries refresh, then modal if refresh fails
 */

type ReauthCallback = () => Promise<boolean>;

let reauthCallback: ReauthCallback | null = null;
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Activity tracking
let lastActivityTime = Date.now();
let activityTimerActive = false;
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const REFRESH_BEFORE_EXPIRY = 3 * 60 * 1000; // Refresh when <3 min left
const TOKEN_LIFETIME = 15 * 60 * 1000; // 15 min token
let lastRefreshTime = Date.now();
let inactivityCheckInterval: ReturnType<typeof setInterval> | null = null;

export function setReauthCallback(cb: ReauthCallback) {
  reauthCallback = cb;
}

const originalFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;

// ─── Activity Tracker ───

function updateActivity() {
  lastActivityTime = Date.now();
}

function startActivityTracking() {
  if (activityTimerActive || typeof window === 'undefined') return;
  activityTimerActive = true;

  // Track user activity
  const events = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart'];
  events.forEach(evt => window.addEventListener(evt, updateActivity, { passive: true }));

  // Check inactivity + auto-refresh every 60s
  inactivityCheckInterval = setInterval(async () => {
    const now = Date.now();
    const idleTime = now - lastActivityTime;
    const timeSinceRefresh = now - lastRefreshTime;

    // User is active and token is getting old → silent refresh
    if (idleTime < INACTIVITY_TIMEOUT && timeSinceRefresh > (TOKEN_LIFETIME - REFRESH_BEFORE_EXPIRY)) {
      const success = await tryRefreshToken();
      if (success) lastRefreshTime = Date.now();
    }

    // User has been inactive too long → show reauth modal
    if (idleTime >= INACTIVITY_TIMEOUT && reauthCallback && !isRefreshing) {
      isRefreshing = true;
      const success = await reauthCallback();
      isRefreshing = false;
      if (success) {
        lastActivityTime = Date.now();
        lastRefreshTime = Date.now();
      }
    }
  }, 60_000); // Check every 60s
}

// ─── Token Refresh ───

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await originalFetch('/api/auth/refresh', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Fetch Interceptor ───

async function interceptedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Record activity on every fetch (user is doing something)
  updateActivity();

  const response = await originalFetch(input, init);

  // Only intercept 401 on API routes (not auth routes themselves)
  if (response.status !== 401) return response;

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.includes('/api/auth/')) return response;

  // Avoid multiple simultaneous refresh attempts
  if (isRefreshing) {
    if (refreshPromise) {
      const success = await refreshPromise;
      if (success) return originalFetch(input, init);
    }
    return response;
  }

  isRefreshing = true;

  // Step 1: Try silent refresh
  refreshPromise = tryRefreshToken();
  const refreshed = await refreshPromise;

  if (refreshed) {
    isRefreshing = false;
    refreshPromise = null;
    lastRefreshTime = Date.now();
    return originalFetch(input, init);
  }

  // Step 2: Refresh failed — ask user to reauth
  if (reauthCallback) {
    const reauthPromise = reauthCallback();
    refreshPromise = reauthPromise;
    const success = await reauthPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (success) {
      lastRefreshTime = Date.now();
      return originalFetch(input, init);
    }
  }

  isRefreshing = false;
  refreshPromise = null;
  return response;
}

// ─── New Session Detection ───

let newSessionChecked = false;

async function checkNewSession() {
  if (newSessionChecked || typeof window === 'undefined') return;
  newSessionChecked = true;

  const SESSION_KEY = 'uniher-session-active';
  const isReturningSession = sessionStorage.getItem(SESSION_KEY);

  if (isReturningSession) {
    // Existing browser session — nothing to do, 401 interceptor handles expiry
    return;
  }

  // New browser session (tab was closed and reopened, or fresh login).
  // If the login flow already set the flag, this won't run.
  // If user navigated directly to a platform page with a stale cookie,
  // don't proactively show modal — let the first API call trigger a 401
  // and the fetch interceptor will handle it naturally.
  // Just try a silent refresh to restore the session.
  const hasRefreshCookie = document.cookie.includes('uniher-refresh-token');
  if (!hasRefreshCookie) {
    // Not logged in — skip, login page will handle
    return;
  }

  // Try silent refresh — if it works, mark session active
  const refreshed = await tryRefreshToken();
  if (refreshed) {
    lastRefreshTime = Date.now();
    sessionStorage.setItem(SESSION_KEY, '1');
    return;
  }

  // Refresh failed — do NOT show reauth modal here.
  // The next API call will get a 401 and the interceptor will handle it.
  // This avoids the false positive on fresh login.
}

// ─── Install ───

export function installFetchInterceptor() {
  if (typeof window !== 'undefined') {
    window.fetch = interceptedFetch;
    startActivityTracking();
    // Check if this is a new browser session (after close/reopen)
    setTimeout(() => checkNewSession(), 500);
  }
}
