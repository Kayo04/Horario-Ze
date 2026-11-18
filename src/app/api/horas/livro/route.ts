import { NextResponse } from 'next/server'
import HorasLivro from '@/models/HorasLivro'
import HorasLivroNome from '@/models/HorasLivroNome'
import { ligarBD, exigirAdmin, semCache } from '@/lib/horas/servidor'
import { validarLivro, normalizarNome } from '@/lib/horas/regras'

export const dynamic = 'force-dynamic'

// POST /api/horas/livro
// Corpo: { livros: [{ month, employeeId, employeeName, livroName, fileName, days }] }
// Guarda as horas do livro de ponto de cada funcionário nesse mês (substitui se já existir)
// e lembra a ligação "nome no livro" -> funcionário do relógio.
export async function POST(req: Request) {
  const { sessao, erro } = await exigirAdmin()
  if (erro) return erro

  let input: any
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.', code: 'bad_request' }, { status: 400 })
  }
  const livros = Array.isArray(input?.livros) ? input.livros : null
  if (!livros || livros.length === 0 || livros.length > 100) {
    return NextResponse.json({ error: 'Não há livros de ponto para importar.', code: 'no_books' }, { status: 400 })
  }

  const limpos = []
  for (const l of livros) {
    const v = validarLivro(l)
    const employeeName = String(l?.employeeName ?? '').trim().slice(0, 100)
    if (!v || !employeeName) {
      return NextResponse.json({ error: 'Há livros de ponto com dados inválidos ou sem funcionário escolhido.', code: 'invalid_books' }, { status: 400 })
    }
    limpos.push({
      ...v,
      employeeName,
      livroName: String(l.livroName ?? '').trim().slice(0, 150),
      fileName: String(l.fileName ?? '').slice(0, 200),
    })
  }

  try {
    await ligarBD()
    await HorasLivro.bulkWrite(
      limpos.map(l => ({
        updateOne: {
          filter: { employeeId: l.employeeId, month: l.month },
          update: {
            $set: {
              employeeId: l.employeeId,
              employeeName: l.employeeName,
              livroName: l.livroName,
              month: l.month,
              days: l.days,
              totalMinutes: l.total,
              fileName: l.fileName,
              importedBy: sessao!.user?.name ?? '',
            },
          },
          upsert: true,
        },
      })),
    )
    const nomes = limpos.filter(l => l.livroName)
    if (nomes.length) {
      await HorasLivroNome.bulkWrite(
        nomes.map(l => ({
          updateOne: {
            filter: { nome: normalizarNome(l.livroName) },
            update: { $set: { nome: normalizarNome(l.livroName), employeeId: l.employeeId } },
            upsert: true,
          },
        })),
      )
    }
    return NextResponse.json({ total: limpos.length }, { headers: semCache })
  } catch (e) {
    console.error('Erro ao importar livro de ponto:', e)
    return NextResponse.json({ error: 'Não foi possível importar. Tenta novamente.', code: 'import_failed' }, { status: 500 })
  }
}

// DELETE /api/horas/livro?month=2026-10&employeeId=13 -> apaga um livro importado por engano
export async function DELETE(req: Request) {
  const { erro } = await exigirAdmin()
  if (erro) return erro

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? ''
  const employeeId = Number(searchParams.get('employeeId'))
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isSafeInteger(employeeId)) {
    return NextResponse.json({ error: 'Pedido inválido.', code: 'bad_request' }, { status: 400 })
  }
  try {
    await ligarBD()
    await HorasLivro.deleteOne({ month, employeeId })
    return NextResponse.json({ ok: true }, { headers: semCache })
  } catch (e) {
    console.error('Erro ao apagar livro de ponto:', e)
    return NextResponse.json({ error: 'Não foi possível apagar.', code: 'delete_failed' }, { status: 500 })
  }
}
