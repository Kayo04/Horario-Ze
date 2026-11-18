// Limpa os dados de um funcionário vindos do browser antes de os gravar (só servidor).
// Evita que alguém envie campos que não devia (ex. um Host a dar-se a si próprio a role de admin).
import { normalizarRole, normalizarPermissoes, type Role, type Quadrado } from '@/lib/permissoes'

export interface CamposFuncionario {
  name?: string
  email?: string
  code?: string
  telefone?: string
  password?: string
  role?: Role
  permissions?: Quadrado[]
}

const texto = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)

/**
 * @param quemEditaEAdmin só um admin pode mudar a role e os quadrados.
 */
export function camposFuncionario(input: any, quemEditaEAdmin: boolean): CamposFuncionario {
  const out: CamposFuncionario = {}
  const name = texto(input?.name, 100)
  const email = texto(input?.email, 200)?.toLowerCase()
  const code = texto(input?.code, 10)?.toUpperCase()
  const telefone = texto(input?.telefone, 30)
  const password = typeof input?.password === 'string' && input.password.length > 0 ? input.password.slice(0, 200) : undefined
  if (name !== undefined) out.name = name
  if (email !== undefined) out.email = email
  if (code !== undefined) out.code = code
  if (telefone !== undefined) out.telefone = telefone
  if (password !== undefined) out.password = password

  if (quemEditaEAdmin && input?.role !== undefined) {
    out.role = normalizarRole(input.role)
    // Admin vê tudo: não precisa de quadrados guardados
    out.permissions = out.role === 'admin' ? [] : normalizarPermissoes(input?.permissions)
  }
  return out
}
