import { NextResponse } from 'next/server'
import HorasMarcacao from '@/models/HorasMarcacao'
import HorasCorrecao from '@/models/HorasCorrecao'
import { ligarBD, exigirAdmin, semCache } from '@/lib/horas/servidor'
import { validarCorrecao } from '@/lib/horas/regras'

export const dynamic = 'force-dynamic'

// POST /api/horas/correcao
// Corpo: { key, revision, start, end, nextDay }
// Só grava se "revision" for a revisão atual (evita apagar a edição de outra pessoa).
export async function POST(req: Request) {
  const { sessao, erro } = await exigirAdmin()
  if (erro) return erro

  let input: any
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.', code: 'bad_request' }, { status: 400 })
  }

  const correcao = validarCorrecao(input)
  if (!correcao || typeof input.key !== 'string') {
    return NextResponse.json({ error: 'Verifica as horas e a opção Dia seguinte.', code: 'invalid_times' }, { status: 400 })
  }

  try {
    await ligarBD()
    const marcacao = await HorasMarcacao.findOne({ key: input.key }).lean<any>()
    if (!marcacao) return NextResponse.json({ error: 'Marcação desconhecida.', code: 'unknown_entry' }, { status: 400 })

    const dados = { ...correcao, key: input.key, correctedBy: sessao!.user?.name ?? '' }
    let gravou = false
    if (input.revision === 0) {
      // Primeira correção: a chave é única, por isso se outra pessoa gravar primeiro dá erro 11000
      try {
        await HorasCorrecao.create(dados)
        gravou = true
      } catch (e: any) {
        if (e?.code !== 11000) throw e
      }
    } else {
      const r = await HorasCorrecao.updateOne({ key: input.key, revision: input.revision }, { $set: dados })
      gravou = r.modifiedCount === 1
    }

    if (!gravou) {
      return NextResponse.json(
        { error: 'Esta marcação foi alterada por outra pessoa. Atualiza os dados antes de voltar a guardar.', code: 'conflict' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        row: {
          key: marcacao.key,
          id: marcacao.employeeId,
          name: marcacao.name,
          date: marcacao.date,
          ...correcao,
        },
      },
      { headers: semCache },
    )
  } catch (e) {
    console.error('Erro ao guardar correção:', e)
    return NextResponse.json({ error: 'Não foi possível guardar. Tenta novamente.', code: 'save_failed' }, { status: 500 })
  }
}
