import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = "http://192.168.100.5:3001";
const TOKEN_KEY = "auth_token_v1";

export async function setAuthToken(token) {
  if (!token) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, String(token));
}

export async function getAuthToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function makeHeaders(extra = {}) {
  const token = await getAuthToken();
  const headers = { ...extra };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function buildQS(params) {
  const { signal, ...rest } = params || {};
  const qs = new URLSearchParams(
    Object.entries(rest)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return { qs, signal };
}

async function parseJsonOrThrow(res) {
  const raw = await res.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(
      `Server did not return JSON (status ${
        res.status
      }). First chars: ${raw.slice(0, 60)}`
    );
  }

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Request failed (${res.status})`
    );
  }

  return data;
}

export async function apiGet(path, params = {}) {
  const { qs, signal } = buildQS(params);
  const url = `${BASE}${path}${qs ? `?${qs}` : ""}`;

  const timeoutController = new AbortController();
  const t = setTimeout(() => timeoutController.abort(), 8000);

  const onAbort = () => timeoutController.abort();
  if (signal) signal.addEventListener("abort", onAbort);

  try {
    const headers = await makeHeaders();
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: timeoutController.signal,
    });
    return await parseJsonOrThrow(res);
  } catch (e) {
    if (String(e?.name) === "AbortError") {
      throw new Error(
        "Request aborted/timeout. Verifică rețeaua sau serverul."
      );
    }
    throw e;
  } finally {
    clearTimeout(t);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

export async function apiPost(path, body = {}, options = {}) {
  const { signal } = options;
  const url = `${BASE}${path}`;

  const timeoutController = new AbortController();
  const t = setTimeout(() => timeoutController.abort(), 8000);

  const onAbort = () => timeoutController.abort();
  if (signal) signal.addEventListener("abort", onAbort);

  try {
    const headers = await makeHeaders({ "Content-Type": "application/json" });

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      signal: timeoutController.signal,
    });

    return await parseJsonOrThrow(res);
  } catch (e) {
    if (String(e?.name) === "AbortError") {
      throw new Error(
        "Request aborted/timeout. Verifică rețeaua sau serverul."
      );
    }
    throw e;
  } finally {
    clearTimeout(t);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

export async function apiDelete(path, options = {}) {
  const { signal } = options;
  const url = `${BASE}${path}`;

  const timeoutController = new AbortController();
  const t = setTimeout(() => timeoutController.abort(), 8000);

  const onAbort = () => timeoutController.abort();
  if (signal) signal.addEventListener("abort", onAbort);

  try {
    const headers = await makeHeaders();

    const res = await fetch(url, {
      method: "DELETE",
      headers,
      signal: timeoutController.signal,
    });

    return await parseJsonOrThrow(res);
  } catch (e) {
    if (String(e?.name) === "AbortError") {
      throw new Error(
        "Request aborted/timeout. Verifică rețeaua sau serverul."
      );
    }
    throw e;
  } finally {
    clearTimeout(t);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
