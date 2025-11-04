// Em: lib/auth.ts (FICHEIRO NOVO)

import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getEmployeeByNameForAuth } from '@/lib/employeeService' 
import bcrypt from 'bcryptjs'

// 👇 AQUI VOLTAMOS A TER O "export"
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
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET, 
}