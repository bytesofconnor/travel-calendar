export function oauthRedirectTo(href: string): string {
  return new URL(href).pathname
}
