// Lazy-injects the Pretendard variable font CSS used by .admin-shell pages.
// Previously this lived in index.html as a top-level <link>, costing ~1.1s
// of LCP on every public page for a font no public page uses. Admin pages
// now call this on mount so the CDN fetch is paid once and only when an
// admin actually opens an admin route.
const HREF =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'

let injected = false

export function loadPretendard(): void {
  if (injected || typeof document === 'undefined') return
  if (document.querySelector(`link[href="${HREF}"]`)) {
    injected = true
    return
  }
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = HREF
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
  injected = true
}
