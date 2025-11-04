// app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/employeeService'
import { EmployeeWithPassword } from '@/types/employee'

// GET (Buscar um funcionário por ID)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ CORREÇÃO: Extrair o ID corretamente
    const id = await Promise.resolve(params.id);
    
    console.log(`🔍 GET /api/employees/${id} - Buscando funcionário`);
    
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const employee = await getEmployeeById(id)
    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
    
    return NextResponse.json(employee)
  } catch (error) {
    console.error(`❌ Erro na API GET /api/employees/${params.id}:`, error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT (Atualizar um funcionário)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ CORREÇÃO: Extrair o ID corretamente
    const id = await Promise.resolve(params.id);
    
    console.log(`📦 PUT /api/employees/${id} - Atualizando funcionário`);

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const employeeData: Partial<EmployeeWithPassword> = await request.json()
    console.log(`📦 PUT /api/employees/${id} - Dados:`, employeeData)

    const success = await updateEmployee(id, employeeData)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Funcionário atualizado' })
    } else {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }
  } catch (error) {
    console.error(`❌ Erro na API PUT /api/employees/${params.id}:`, error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE (Eliminar um funcionário) - CÓDIGO CORRIGIDO
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ CORREÇÃO: Extrair o ID corretamente usando Promise.resolve()
    const id = await Promise.resolve(params.id);
    
    console.log('🗑️ API DELETE chamada para ID:', id)
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    console.log(`🔧 ID recebido na API: "${id}"`)

    const success = await deleteEmployee(id)
    
    if (success) {
      console.log(`✅ Funcionário ${id} eliminado com sucesso`)
      return NextResponse.json({ 
        success: true,
        message: 'Funcionário apagado com sucesso' 
      })
    } else {
      console.error(`❌ Erro ao eliminar funcionário ${id} - não encontrado ou ID inválido`)
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error(`❌ Erro na API DELETE /api/employees/${params.id}:`, error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}