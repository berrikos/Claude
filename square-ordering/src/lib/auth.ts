import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

declare module "next-auth" {
  interface User {
    role?: string;
    merchantId?: string;
    userType: "customer" | "merchant";
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: string;
      merchantId?: string;
      userType: "customer" | "merchant";
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      id: "merchant-login",
      name: "Merchant Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.merchantUser.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        await db.merchantUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: [user.givenName, user.familyName].filter(Boolean).join(" ") || null,
          role: user.role,
          merchantId: user.merchantId,
          userType: "merchant" as const,
        };
      },
    }),
    Credentials({
      id: "customer-login",
      name: "Customer Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: [user.givenName, user.familyName].filter(Boolean).join(" ") || null,
          userType: "customer" as const,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.id = user.id!;
        token.role = u.role as string | undefined;
        token.merchantId = u.merchantId as string | undefined;
        token.userType = u.userType as string;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string | undefined;
      session.user.merchantId = token.merchantId as string | undefined;
      session.user.userType = token.userType as "customer" | "merchant";
      return session;
    },
  },
});
