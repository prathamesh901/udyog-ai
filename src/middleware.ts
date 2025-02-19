import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  publicRoutes: ['/', '/auth(.*)', '/portal(.*)', '/images(.*)', '/favicon.ico'],
  ignoredRoutes: ['/chatbot'],
  afterAuth(auth, req) {
    if (!auth.userId && req.nextUrl.pathname.startsWith('/dashboard')) {
      return Response.redirect(new URL('/auth/sign-in', req.url));
    }
  },
});

export const config = {
  matcher: ['/((?!.+.[w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
