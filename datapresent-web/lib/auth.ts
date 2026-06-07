import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { env } from "@/env";
import { extractTokenPrefix, verifyToken } from "@/lib/crypto";
import { normalizeEmail } from "@/lib/email-normalize";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "magic-link",
      credentials: {
        token: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        const token = credentials.token as string;

        // Find candidate tokens by token prefix for O(1) indexed lookup
        const tokenPrefix = extractTokenPrefix(token);
        const candidates = await prisma.magicLinkToken.findMany({
          where: {
            tokenPrefix,
            used: false,
            expires: { gt: new Date() },
          },
        });

        let magicLinkToken = null;
        for (const candidate of candidates) {
          if (await verifyToken(token, candidate.token)) {
            magicLinkToken = candidate;
            break;
          }
        }

        if (!magicLinkToken) {
          return null;
        }

        await prisma.magicLinkToken.update({
          where: { id: magicLinkToken.id },
          data: { used: true },
        });

        let user = await prisma.user.findUnique({
          where: { email: magicLinkToken.email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: magicLinkToken.email,
              name: magicLinkToken.email.split("@")[0],
              isVerified: true,
              emailVerified: new Date(),
            },
          });
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    CredentialsProvider({
      id: "password",
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = normalizeEmail(credentials.email as string);
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const stored = await prisma.password.findUnique({
          where: { userId: user.id },
        });
        if (!stored) return null;
        const valid = await verifyPassword(credentials.password as string, stored.hash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        // Read isVerified from the JWT token (set in jwt callback)
        (session.user as unknown as Record<string, unknown>).isVerified =
          (token as Record<string, unknown>).isVerified ?? false;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        token.iat = Math.floor(Date.now() / 1000);

        // Fetch verification status on first login
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isVerified: true, emailVerified: true },
        });

        if (dbUser) {
          (token as Record<string, unknown>).isVerified =
            dbUser.isVerified || !!dbUser.emailVerified;
        }
      }

      // Handle session updates — re-fetch isVerified from DB, never trust client data
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { isVerified: true, emailVerified: true },
        });
        if (dbUser) {
          (token as Record<string, unknown>).isVerified =
            dbUser.isVerified || !!dbUser.emailVerified;
        }
      }

      // Check token age for rotation (24 hours)
      const now = Math.floor(Date.now() / 1000);
      if (token.iat && now - token.iat > 24 * 60 * 60) {
        token.needsRefresh = true;
      }

      // Transparent rotation: reset iat so the JWT is re-issued with a fresh timestamp
      if (token.needsRefresh) {
        token.iat = Math.floor(Date.now() / 1000);
        delete token.needsRefresh; // Prevent infinite rotation on subsequent calls
      }

      return token;
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
});
