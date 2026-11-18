import { NextRequest, NextResponse } from 'next/server'
import { getEmployees, createEmployee } from '@/lib/employeeService'
import { exigirQuadrado, exigirSessao, eAdmin } from '@/lib/permissoesServidor'
import { camposFuncionario } from '@/lib/camposFuncionario'

// GET: lista de funcionários (usada no horário, gerir horários, painel de admin, ...) - qualquer sessão
export async function GET() {
  const { erro } = await exigirSessao()
  if (erro) return erro
  try {
    const employees = await getEmployees()
    return NextResponse.json(employees)
  } catch (error) {
    console.error('❌ GET /api/employees - Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar funcionários' }, { status: 500 })
  }
}

// POST: criar funcionário - precisa do quadrado Gerir Funcionários.
// Só um admin escolhe a role e os quadrados; os outros criam sempre um Host sem quadrados extra.
export async function POST(request: NextRequest) {
  const { sessao, erro } = await exigirQuadrado('funcionarios')
  if (erro) return erro
  try {
    const dados = camposFuncionario(await request.json(), eAdmin(sessao))
    if (!dados.name || !dados.email || !dados.password) {
      return NextResponse.json({ error: 'Nome, email e password são obrigatórios', code: 'missing_fields' }, { status: 400 })
    }
    if (!dados.role) dados.role = 'host'
    const id = await createEmployee(dados as any)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('❌ POST /api/employees - Erro:', error)
    return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 })
  }
}
