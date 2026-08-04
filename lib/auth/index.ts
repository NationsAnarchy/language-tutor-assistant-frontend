import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: process.env.NODE_ENV === 'development' && process.env.AUTH_DEBUG === 'true',
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  callbacks: {
    jwt({ token, account, profile }) {
      // Attach the user's email as sub for backend compatibility
      if (profile?.email) {
        // Always use email as the stable user identifier across sign-ins
        // Provider sub may change per session; email is permanent
        token.sub = profile.email
        token.email = profile.email
      }
      return token
    },
    session({ session, token }) {
      // Expose user id (sub) for the API client
      session.user.id = token.sub || ''
      return session
    },
  },
})

// Extend the built-in session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
