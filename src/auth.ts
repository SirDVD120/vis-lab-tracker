import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "google" && account.providerAccountId) {
        (token as { googleSub?: string }).googleSub = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      const googleSub = (token as { googleSub?: string }).googleSub;
      if (googleSub) {
        (session as { googleSub?: string }).googleSub = googleSub;
      }
      return session;
    },
  },
  trustHost: true,
});

declare module "next-auth" {
  interface Session {
    googleSub?: string;
  }
}
