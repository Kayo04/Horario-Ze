// app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/employeeService'
import { exigirQuadrado, exigirSessao, eAdmin } from '@/lib/permissoesServidor'
import { camposFuncionario } from '@/lib/camposFuncionario'

// GET (Buscar um funcionário por ID) - qualquer sessão
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { erro } = await exigirSessao()
  if (erro) return erro
  try {
    const employee = await getEmployeeById(params.id)
    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    return NextResponse.json(employee)
  } catch (error) {
    console.error(`❌ Erro na API GET /api/employees/${params.id}:`, error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT (Atualizar um funcionário) - precisa do quadrado Gerir Funcionários.
// Role e quadrados: só admin. Quem não é admin não pode editar contas de admin.
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { sessao, erro } = await exigirQuadrado('funcionarios')
  if (erro) return erro
  try {
    const id = params.id
    const atual = await getEmployeeById(id)
    if (!atual) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    const admin = eAdmin(sessao)
    if (!admin && atual.role === 'admin') {
      return NextResponse.json({ error: 'Só um admin pode editar outro admin.', code: 'forbidden' }, { status: 403 })
    }

    const dados = camposFuncionario(await request.json(), admin)
    // Um admin não pode tirar a si próprio a role de admin (ficava sem acesso)
    if (id === sessao.user.id && dados.role && dados.role !== 'admin') {
      return NextResponse.json({ error: 'Não podes tirar a ti próprio a role de admin.', code: 'own_role' }, { status: 400 })
    }

    await updateEmployee(id, dados as any)
    return NextResponse.json({ success: true, message: 'Funcionário atualizado' })
  } catch (error) {
    console.error(`❌ Erro na API PUT /api/employees/${params.id}:`, error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE (Eliminar um funcionário) - precisa do quadrado Gerir Funcionários.
// Ninguém se apaga a si próprio; quem não é admin não apaga admins.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { sessao, erro } = await exigirQuadrado('funcionarios')
  if (erro) return erro
  try {
    const id = params.id
    if (id === sessao.user.id) {
      return NextResponse.json({ error: 'Não podes apagar a tua própria conta.', code: 'own_account' }, { status: 400 })
    }
    const atual = await getEmployeeById(id)
    if (!atual) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    if (!eAdmin(sessao) && atual.role === 'admin') {
      return NextResponse.json({ error: 'Só um admin pode apagar outro admin.', code: 'forbidden' }, { status: 403 })
    }

    const success = await deleteEmployee(id)
    if (success) {
      return NextResponse.json({ success: true, message: 'Funcionário apagado com sucesso' })
    }
    return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
  } catch (error) {
    console.error(`❌ Erro na API DELETE /api/employees/${params.id}:`, error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
