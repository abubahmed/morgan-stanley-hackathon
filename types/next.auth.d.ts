// types/next-auth.d.ts
// Extends NextAuth's built-in types to include the role field.
// TypeScript will pick this up automatically.

import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "client" | "admin";
    };
  }

  interface User {
    role: "client" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: "client" | "admin";
  }
}