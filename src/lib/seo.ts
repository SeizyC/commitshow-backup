// Client-side <head> management for the directory SPA. The edge middleware
// (functions/v2/_middleware.ts) is what non-JS crawlers and social scrapers
// read; this keeps the title / description / canonical / JSON-LD correct during
// client-side navigation and for JS-executing crawlers (Googlebot renders JS).

function upsertMeta(selector: string, attr: string, key: string, content: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}
function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el) }
  el.setAttribute('href', href)
}

const JSONLD_ID = 'legit-jsonld'

export function setHead(opts: { title: string; description?: string; canonical?: string; jsonld?: unknown }) {
  if (typeof document === 'undefined') return
  document.title = opts.title
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', opts.title)
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', opts.title)
  if (opts.description) {
    upsertMeta('meta[name="description"]', 'name', 'description', opts.description)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', opts.description)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', opts.description)
  }
  if (opts.canonical) { upsertLink('canonical', opts.canonical); upsertMeta('meta[property="og:url"]', 'property', 'og:url', opts.canonical) }
  if (opts.jsonld !== undefined) {
    let s = document.getElementById(JSONLD_ID) as HTMLScriptElement | null
    if (!s) { s = document.createElement('script'); s.id = JSONLD_ID; s.type = 'application/ld+json'; document.head.appendChild(s) }
    s.textContent = JSON.stringify(opts.jsonld)
  }
}

// Drop the page-specific JSON-LD when leaving a directory page so stale
// structured data doesn't linger on the next route.
export function clearJsonLd() {
  if (typeof document === 'undefined') return
  document.getElementById(JSONLD_ID)?.remove()
}
