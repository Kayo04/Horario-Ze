import { NextResponse } from 'next/server'
import HorasMarcacao from '@/models/HorasMarcacao'
import HorasCorrecao from '@/models/HorasCorrecao'
import { ligarBD, exigirAdmin, semCache } from '@/lib/horas/servidor'
import { livroPonto } from '@/lib/horas/livroPonto'
import { IDS_EXCLUIDOS, type Marcacao } from '@/lib/horas/regras'

export const dynamic = 'force-dynamic'

// GET /api/horas -> todas as marcações já com as correções aplicadas
export async function GET() {
  const { erro } = await exigirAdmin()
  if (erro) return erro

  try {
    await ligarBD()
    const [marcacoes, correcoes] = await Promise.all([
      HorasMarcacao.find({ employeeId: { $nin: IDS_EXCLUIDOS } }).sort({ date: 1, start: 1 }).lean<any[]>(),
      HorasCorrecao.find().lean<any[]>(),
    ])
    const porChave = new Map(correcoes.map(c => [c.key, c]))

    const records: Marcacao[] = marcacoes.map(m => {
      const c = porChave.get(m.key)
      const base: Marcacao = {
        key: m.key,
        id: m.employeeId,
        name: m.name,
        date: m.date,
        start: m.start,
        end: m.end,
        minutes: m.minutes,
        nextDay: m.nextDay,
        state: m.state,
        revision: 0,
      }
      return c
        ? { ...base, start: c.start, end: c.end, nextDay: c.nextDay, minutes: c.minutes, state: c.state, revision: c.revision }
        : base
    })

    return NextResponse.json({ records, comparison: livroPonto }, { headers: semCache })
  } catch (e) {
    console.error('Erro ao carregar horas:', e)
    return NextResponse.json({ error: 'Não foi possível carregar as horas.' }, { status: 500 })
  }
}
