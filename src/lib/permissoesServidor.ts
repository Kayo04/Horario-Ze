// Verificação de permissões nas rotas da API (só servidor).
import { getServerSession, type Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { podeVer, normalizarRole, type Quadrado } from '@/lib/permissoes'

type Resultado = { sessao: Session; erro?: undefined } | { sessao?: undefined; erro: NextResponse }

/** Exige sessão e acesso ao quadrado (admin tem sempre). Devolve { sessao } ou { erro } para devolver logo. */
export async function exigirQuadrado(quadrado: Quadrado): Promise<Resultado> {
  const sessao = await getServerSession(authOptions)
  if (!sessao) return { erro: NextResponse.json({ error: 'Não autenticado.', code: 'unauthenticated' }, { status: 401 }) }
  if (!podeVer(sessao.user.role, sessao.user.permissions, quadrado)) {
    return { erro: NextResponse.json({ error: 'Sem permissão para esta área.', code: 'forbidden' }, { status: 403 }) }
  }
  return { sessao }
}

/** Exige sessão (qualquer role). */
export async function exigirSessao(): Promise<Resultado> {
  const sessao = await getServerSession(authOptions)
  if (!sessao) return { erro: NextResponse.json({ error: 'Não autenticado.', code: 'unauthenticated' }, { status: 401 }) }
  return { sessao }
}

export const eAdmin = (sessao: Session) => normalizarRole(sessao.user.role) === 'admin'
