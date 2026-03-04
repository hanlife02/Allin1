export const AUTH_COOKIE_NAME = "allin1_auth"

export interface AuthCredentials {
  username: string
  password: string
}

export function getAuthCredentials(): AuthCredentials | null {
  const username =
    process.env.ALLIN1_AUTH_USERNAME?.trim() ||
    process.env.APP_AUTH_USERNAME?.trim() ||
    ""
  const password =
    process.env.ALLIN1_AUTH_PASSWORD?.trim() ||
    process.env.APP_AUTH_PASSWORD?.trim() ||
    ""

  if (!username || !password) return null
  return { username, password }
}

export function buildAuthToken(credentials: AuthCredentials): string {
  return encodeURIComponent(`${credentials.username}\n${credentials.password}`)
}

export function isAuthenticatedByToken(token: string | undefined | null): boolean {
  if (!token) return false
  const credentials = getAuthCredentials()
  if (!credentials) return false
  return token === buildAuthToken(credentials)
}

export function isValidLoginInput(
  username: string | undefined,
  password: string | undefined,
): boolean {
  const credentials = getAuthCredentials()
  if (!credentials) return false
  return username === credentials.username && password === credentials.password
}

export function sanitizeRedirectPath(path?: string): string {
  if (!path || !path.startsWith("/")) return "/daily"
  if (path.startsWith("//")) return "/daily"
  if (path.startsWith("/login")) return "/daily"
  return path
}
