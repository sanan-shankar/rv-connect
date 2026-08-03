const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LOCAL_URL_ERROR = "Expected a loopback HTTP(S) URL without credentials";

/** Keep authenticated browser QA from sending owner credentials off-machine. */
export function requireLoopbackBaseUrl(value = "http://localhost:3000") {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(LOCAL_URL_ERROR);
  }

  const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
  const hasCredentials = Boolean(parsed.username || parsed.password);
  if (!isHttp || hasCredentials || !LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error(LOCAL_URL_ERROR);
  }

  return parsed.origin;
}

/** Reject a cross-origin redirect before any owner credential enters the browser. */
export function assertSameOriginAfterNavigation(trustedOrigin, currentUrl) {
  if (new URL(currentUrl).origin !== trustedOrigin) {
    throw new Error("Authenticated QA redirected away from its trusted local origin");
  }
}

/** Chrome expects IPv6 cookie domains in the bracketed form URL.hostname returns. */
export function cookieDomainForBaseUrl(baseUrl) {
  return new URL(baseUrl).hostname;
}
