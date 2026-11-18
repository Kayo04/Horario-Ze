import { NextResponse } from 'next/server'
import HorasMarcacao from '@/models/HorasMarcacao'
import { ligarBD, exigirAdmin, semCache } from '@/lib/horas/servidor'
import { validarLinhaImportada, chaveMarcacao } from '@/lib/horas/regras'

export const dynamic = 'force-dynamic'

const MAX_LINHAS = 10000

// POST /api/horas/importar
// Corpo: { rows: LinhaImportada[] } (o browser já leu o CSV/Excel)
// Insere marcações novas e atualiza as existentes (pela chave estável).
// As correções manuais ficam intactas porque estão noutra coleção.
export async function POST(req: Request) {
  const { erro } = await exigirAdmin()
  if (erro) return erro

  let input: any
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const rows = Array.isArray(input?.rows) ? input.rows : null
  if (!rows || rows.length === 0) return NextResponse.json({ error: 'O ficheiro não tem marcações.' }, { status: 400 })
  if (rows.length > MAX_LINHAS) return NextResponse.json({ error: `Máximo de ${MAX_LINHAS} linhas por importação.` }, { status: 400 })

  // Validar outra vez no servidor (nunca confiar só no browser)
  const validas = []
  for (const row of rows) {
    const linha = validarLinhaImportada(row)
    if (!linha) return NextResponse.json({ error: 'O ficheiro tem linhas inválidas.' }, { status: 400 })
    validas.push(linha)
  }

  // Chave estável; se a mesma pessoa tiver duas marcações iguais no mesmo dia, acrescenta um sufixo
  const vistas = new Map<string, number>()
  const operacoes = validas.map(l => {
    const base = chaveMarcacao(l.id, l.date, l.start)
    const n = (vistas.get(base) ?? 0) + 1
    vistas.set(base, n)
    const key = n === 1 ? base : `${base}-${n}`
    const nextDay = Boolean(l.start && l.end && l.end < l.start)
    return {
      updateOne: {
        filter: { key },
        update: {
          $set: {
            key,
            employeeId: l.id,
            name: l.name,
            date: l.date,
            start: l.start,
            end: l.end,
            minutes: l.minutes,
            nextDay,
            state: l.state,
          },
        },
        upsert: true,
      },
    }
  })

  try {
    await ligarBD()
    const r = await HorasMarcacao.bulkWrite(operacoes, { ordered: false })
    return NextResponse.json(
      { total: operacoes.length, novas: r.upsertedCount, atualizadas: r.modifiedCount },
      { headers: semCache },
    )
  } catch (e) {
    console.error('Erro ao importar horas:', e)
    return NextResponse.json({ error: 'Não foi possível importar. Tenta novamente.' }, { status: 500 })
  }
}
