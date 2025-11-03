// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getEmployeeByNameForAuth } from '@/lib/employeeService' 
import bcrypt from 'bcryptjs'
import { Employee } from '@/types/employee' 

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        name: { label: "Nome", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.name || !credentials.password) {
          return null
        }
        const employee = await getEmployeeByNameForAuth(credentials.name);
        if (!employee) { return null }

        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          employee.password 
        )
        if (!passwordsMatch) { return null }

        return {
          id: employee._id.toString(),
          name: employee.name,
          email: employee.email,
          role: employee.role,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt', 
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role as 'admin' | 'employee'
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.name = token.name
      }
      return session
    }
  },
  pages: {
    // <-- MUDANÇA IMPORTANTE AQUI
    signIn: '/', // AVISAR O NEXT-AUTH QUE A PÁGINA DE LOGIN É A RAIZ
    // <-- FIM DA MUDANÇA
  },
  secret: process.env.NEXTAUTH_SECRET, 
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }