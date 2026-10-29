export function oauthRedirectTo(href: string): string {
  const url = new URL(href)
  url.searchParams.delete("code")
  return `${url.pathname}${url.search}`
}
