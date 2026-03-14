/**
 * auth.ts — NextAuth config using Supabase
 * Place at project root.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user, error } = await supabase
          .from("users")
          .select("id, name, email, password_hash, role")
          .eq("email", credentials.email as string)
          .single();

        if (error || !user) return null;

        const valid = bcrypt.compareSync(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        // Update last_login
        await supabase
          .from("users")
          .update({ last_login: new Date().toISOString() })
          .eq("id", user.id);

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          role:  user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id   = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});