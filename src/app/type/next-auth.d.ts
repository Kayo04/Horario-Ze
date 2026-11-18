// types/next-auth.d.ts
import { DefaultSession } from "next-auth"
import type { Role, Quadrado } from "@/lib/permissoes"

declare module "next-auth" {
  /**
   * O que é retornado pela `session` (ex: useSession)
   */
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: Quadrado[]; // quadrados extra que um Host/Manager pode ver
    } & DefaultSession["user"]
  }

  /**
   * O que é retornado pelo `authorize` e guardado no token
   */
  interface User {
    id: string;
    role: Role;
    permissions: Quadrado[];
  }
}

declare module "next-auth/jwt" {
  /** O que é guardado no token JWT */
  interface JWT {
    id: string;
    role: Role;
    permissions: Quadrado[];
    atualizadoEm?: number; // quando a role/quadrados foram lidos da base de dados
  }
}
