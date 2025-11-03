// app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/employeeService'
import { EmployeeWithPassword } from '@/types/employee'

// GET (Buscar um funcionário por ID)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id; // <-- Declarar no topo
  try {
    const employee = await getEmployeeById(id) // Usar a variável
    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    return NextResponse.json(employee)
  } catch (error) {
    console.error(`❌ Erro na API GET /api/employees/${id}:`, error) // <-- Agora funciona
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT (Atualizar um funcionário)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id; // <-- Declarar no topo
  try {
    const employeeData: Partial<EmployeeWithPassword> = await request.json()
    console.log(`📦 PUT /api/employees/${id} - Dados:`, employeeData)

    const success = await updateEmployee(id, employeeData)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Funcionário atualizado' })
    } else {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
  } catch (error) {
    console.error(`❌ Erro na API PUT /api/employees/${id}:`, error) // <-- Agora funciona
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE (Código melhorado)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id; // <-- Declarar no topo
  try {
    console.log('🗑️ API DELETE chamada para ID:', id)
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    const success = await deleteEmployee(id)
    
    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'Funcionário apagado com sucesso' 
      })
    } else {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error(`❌ Erro na API DELETE /api/employees/${id}:`, error) // <-- Log melhorado
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}