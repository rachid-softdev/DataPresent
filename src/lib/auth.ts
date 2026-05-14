import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "magic-link",
      credentials: {
        token: { type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.token) return null
        const token = credentials.token as string

        const magicLinkToken = await prisma.magicLinkToken.findUnique({
          where: { token }
        })

        if (!magicLinkToken || magicLinkToken.used || magicLinkToken.expires < new Date()) {
          return null
        }

        await prisma.magicLinkToken.update({
          where: { id: magicLinkToken.id },
          data: { used: true }
        })

        const user = await prisma.user.findUnique({
          where: { email: magicLinkToken.email }
        })

        if (!user) return null

        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub

        // Get user verification status
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { isVerified: true, emailVerified: true }
        })

        if (user) {
          (session.user as any).isVerified = user.isVerified || !!user.emailVerified
        }
      }
      return session
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id
        token.iat = Math.floor(Date.now() / 1000)
      }

      // Handle session updates
      if (trigger === 'update' && session?.expires) {
        token.expires = session.expires
      }

      // Check token age for rotation (24 hours)
      const now = Math.floor(Date.now() / 1000)
      if (token.iat && (now - token.iat) > 24 * 60 * 60) {
        token.needsRefresh = true
      }

      return token
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update session every hour
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
})