import { NextResponse } from 'next/server'
import HorasMarcacao from '@/models/HorasMarcacao'
import HorasCorrecao from '@/models/HorasCorrecao'
import HorasLivro from '@/models/HorasLivro'
import HorasLivroNome from '@/models/HorasLivroNome'
import { ligarBD, exigirAdmin, semCache } from '@/lib/horas/servidor'
import { livroPonto } from '@/lib/horas/livroPonto'
import { IDS_EXCLUIDOS, type Marcacao, type LivroFuncionario } from '@/lib/horas/regras'

export const dynamic = 'force-dynamic'

// GET /api/horas -> todas as marcações já com as correções aplicadas,
// mais os livros de ponto importados (para comparar com o relógio)
export async function GET() {
  const { erro } = await exigirAdmin()
  if (erro) return erro

  try {
    await ligarBD()
    const [marcacoes, correcoes, livrosBD, nomesBD] = await Promise.all([
      HorasMarcacao.find({ employeeId: { $nin: IDS_EXCLUIDOS } }).sort({ date: 1, start: 1 }).lean<any[]>(),
      HorasCorrecao.find().lean<any[]>(),
      HorasLivro.find({ employeeId: { $nin: IDS_EXCLUIDOS } }).lean<any[]>(),
      HorasLivroNome.find().lean<any[]>(),
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

    // livros[mês][ID do relógio] = horas escritas no livro de ponto
    const livros: Record<string, Record<string, LivroFuncionario>> = {}
    for (const l of livrosBD) {
      livros[l.month] ??= {}
      livros[l.month][String(l.employeeId)] = {
        employeeName: l.employeeName,
        livroName: l.livroName,
        total: l.totalMinutes,
        days: (l.days ?? []).map((d: any) => ({ date: d.date, periods: d.periods, minutes: d.minutes })),
      }
    }
    // nome normalizado no livro -> ID no relógio (escolhas feitas em importações anteriores)
    const nomesLivro: Record<string, number> = Object.fromEntries(nomesBD.map(n => [n.nome, n.employeeId]))

    // comparison = totais antigos recuperados do site do chefe (só totais), usados quando não há livro importado
    return NextResponse.json({ records, comparison: livroPonto, livros, nomesLivro }, { headers: semCache })
  } catch (e) {
    console.error('Erro ao carregar horas:', e)
    return NextResponse.json({ error: 'Não foi possível carregar as horas.', code: 'load_failed' }, { status: 500 })
  }
}
