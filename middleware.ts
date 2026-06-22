import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Required by next-intl: redirects `/` → `/en` and resolves locale-prefixed routes.
// Without this, the root URL matches no route and Next.js returns a 404.
export default createMiddleware(routing)

export const config = {
  // Match all paths except API routes, Next internals, Vercel internals and static files.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
