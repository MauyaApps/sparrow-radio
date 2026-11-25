const ACCOUNT_URL = import.meta.env.VITE_ACCOUNT_URL ||
  (import.meta.env.DEV ? "/account-api" : "https://sparrow-account-api.sparrownet.workers.dev");
let refreshInFlight = null;

class AccountApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${ACCOUNT_URL}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) throw new Error("Account API returned an invalid response.");
  }
  if (!response.ok) throw new AccountApiError(payload?.error?.message || `Request failed (${response.status})`, response.status);
  return payload;
}

export function getAccessToken() {
  return localStorage.getItem("sparrow_radio_access");
}

export function getRefreshToken() {
  return localStorage.getItem("sparrow_radio_refresh");
}

export function getListenerClientId() {
  let id = sessionStorage.getItem("sparrow_radio_listener_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("sparrow_radio_listener_id", id);
  }
  return id;
}

export function clearSession() {
  localStorage.removeItem("sparrow_radio_access");
  localStorage.removeItem("sparrow_radio_refresh");
  localStorage.removeItem("sparrow_radio_user");
  localStorage.removeItem("sparrow_radio_user_id");
}

export async function logout() {
  const token = getAccessToken();
  try {
    if (token) {
      await api("/v1/logout", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: "{}",
      });
    }
  } finally {
    clearSession();
  }
}

export async function login(username, password) {
  const { client, ready } = await import("@serenity-kit/opaque");
  await ready;
  const start = client.startLogin({ password });
  const response = await api("/v1/login/start", {
    method: "POST",
    body: JSON.stringify({ username, startLoginRequest: start.startLoginRequest }),
  });
  const finish = client.finishLogin({
    clientLoginState: start.clientLoginState,
    loginResponse: response.loginResponse,
    password,
  });
  if (!finish) throw new Error("Incorrect username or password.");
  const result = await api("/v1/login/finish", {
    method: "POST",
    body: JSON.stringify({ attemptId: response.attemptId, finishLoginRequest: finish.finishLoginRequest }),
  });
  localStorage.setItem("sparrow_radio_access", result.accessToken);
  localStorage.setItem("sparrow_radio_refresh", result.refreshToken);
  localStorage.setItem("sparrow_radio_user", username);
  localStorage.setItem("sparrow_radio_user_id", result.userId);
  return result;
}

export async function register(username, password) {
  const { client, ready } = await import("@serenity-kit/opaque");
  await ready;
  const start = client.startRegistration({ password });
  const response = await api("/v1/register/start", {
    method: "POST",
    body: JSON.stringify({ username, registrationRequest: start.registrationRequest }),
  });
  const finish = client.finishRegistration({
    clientRegistrationState: start.clientRegistrationState,
    registrationResponse: response.registrationResponse,
    password,
  });
  await api("/v1/register/finish", {
    method: "POST",
    body: JSON.stringify({ username, registrationRecord: finish.registrationRecord }),
  });
}

export async function refreshSession() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshSessionOnce();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function refreshSessionOnce() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const result = await api("/v1/token/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    localStorage.setItem("sparrow_radio_access", result.accessToken);
    localStorage.setItem("sparrow_radio_refresh", result.refreshToken);
    return result.accessToken;
  } catch (error) {
    if (error instanceof AccountApiError && (error.status === 401 || error.status === 403)) {
      clearSession();
      return null;
    }
    throw error;
  }
}

export async function freshAccessToken() {
  const token = getAccessToken();
  if (!token) return null;
  let expiresAt;
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part + "=".repeat((4 - part.length % 4) % 4)));
    expiresAt = payload.exp;
  } catch {
    return refreshSession();
  }
  if (typeof expiresAt === "number" && expiresAt > Math.floor(Date.now() / 1000) + 30) return token;
  return refreshSession();
}
