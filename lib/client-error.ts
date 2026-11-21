const CONVEX_CLIENT_ERROR = /\[CONVEX|Request ID|Server Error|Called by client|ArgumentValidation|Uncaught /i

export function isConvexClientError(message: string) {
  return CONVEX_CLIENT_ERROR.test(message)
}

/** A sentence safe to show. Convex client strings stay in the console. */
export function publicError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : ""
  if (message && !isConvexClientError(message)) return message
  console.error(fallback, error)
  return fallback
}
