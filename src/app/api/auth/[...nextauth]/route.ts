// Em: app/api/auth/[...nextauth]/route.ts (AGORA FICA SÓ ISTO)

import NextAuth from "next-auth"
// Agora importa as opções do novo ficheiro que vais criar
import { authOptions } from "@/lib/auth" 

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }