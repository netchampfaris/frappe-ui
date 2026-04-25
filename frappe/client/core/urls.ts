/**
 * URL builders for the Frappe `/api/v2/document/...` namespace.
 *
 * Both `doctype` and `name` are URL-encoded because doctypes commonly contain
 * spaces (e.g. "GP Poll") and names can contain `/`, `#`, or other reserved
 * characters that must not bleed into the URL path.
 */

export function docCollectionUrl(doctype: string): string {
  return `/api/v2/document/${encodeURIComponent(doctype)}`
}

export function docResourceUrl(doctype: string, name: string): string {
  return `${docCollectionUrl(doctype)}/${encodeURIComponent(name)}`
}

export function docMethodUrl(
  doctype: string,
  name: string,
  method: string,
): string {
  return `${docResourceUrl(doctype, name)}/method/${encodeURIComponent(method)}`
}
