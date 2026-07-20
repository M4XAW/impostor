export function roomSessionCookieName(code: string) {
  return `impostor_session_${code}`;
}

export function getCookieValue(cookieHeader: string | undefined, name: string) {
  const prefix = `${name}=`;
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return undefined;

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return undefined;
  }
}
