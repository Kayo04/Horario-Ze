// Utilitários só de servidor para as rotas /api/horas.
import mongoose from 'mongoose'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { podeVer } from '@/lib/permissoes'

export async function ligarBD() {
  if (mongoose.connection.readyState >= 1) return
  if (!process.env.MONGODB_URI) throw new Error('Define MONGODB_URI no .env')
  await mongoose.connect(process.env.MONGODB_URI)
}

/**
 * Garante que quem faz o pedido pode usar a Gestão de Horas (admin, ou Host/Manager com esse quadrado).
 * Devolve { sessao } se estiver tudo bem, ou { erro } com a resposta a devolver.
 */
export async function exigirAdmin() {
  const sessao = await getServerSession(authOptions)
  if (!sessao) return { erro: NextResponse.json({ error: 'Não autenticado.', code: 'unauthenticated' }, { status: 401 }) }
  if (!podeVer(sessao.user.role, sessao.user.permissions, 'horas')) {
    return { erro: NextResponse.json({ error: 'Sem acesso à Gestão de Horas.', code: 'forbidden' }, { status: 403 }) }
  }
  return { sessao }
}

export const semCache = { 'Cache-Control': 'private, no-store' }
