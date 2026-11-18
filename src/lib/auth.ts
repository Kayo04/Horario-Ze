// Em: lib/auth.ts

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getEmployeeByNameForAuth, getEmployeeById } from '@/lib/employeeService'
import { normalizarRole, normalizarPermissoes } from '@/lib/permissoes'
import bcrypt from 'bcryptjs'

// De quanto em quanto tempo a sessão volta a ler a role e os quadrados da base de dados.
// Assim, quando o admin muda a role/quadrados de alguém, a mudança chega a essa pessoa
// em cerca de 1 minuto, sem ela ter de sair e voltar a entrar.
const ATUALIZAR_A_CADA_MS = 60 * 1000

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
          role: normalizarRole(employee.role),
          permissions: normalizarPermissoes(employee.permissions),
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
        token.permissions = user.permissions
        token.atualizadoEm = Date.now()
        return token
      }
      // Sessões antigas ou desatualizadas: volta a ler da base de dados
      if (token.id && (!token.atualizadoEm || Date.now() - token.atualizadoEm > ATUALIZAR_A_CADA_MS)) {
        try {
          const emp = await getEmployeeById(token.id)
          if (emp) {
            token.role = normalizarRole(emp.role)
            token.permissions = normalizarPermissoes(emp.permissions)
          }
          token.atualizadoEm = Date.now()
        } catch {
          // Base de dados indisponível: mantém o que já tinha
        }
      }
      token.role = normalizarRole(token.role)
      token.permissions = normalizarPermissoes(token.permissions)
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id
        session.user.role = normalizarRole(token.role)
        session.user.permissions = normalizarPermissoes(token.permissions)
      }
      return session
    }
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
