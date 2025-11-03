// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * O que é retornado pela `session` (ex: useSession)
   */
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'employee';
    } & DefaultSession["user"]
  }

  /**
   * O que é retornado pelo `authorize` e guardado no token
   */
  interface User {
    id: string;
    role: 'admin' | 'employee';
  }
}

declare module "next-auth/jwt" {
  /** O que é guardado no token JWT */
  interface JWT {
    id: string;
    role: 'admin' | 'employee';
  }
}