import { NextRequest, NextResponse } from 'next/server'
import { getEmployees, createEmployee } from '@/lib/employeeService'

export async function GET() {
  console.log('📥 GET /api/employees - Iniciando...')
  try {
    const employees = await getEmployees()
    console.log('✅ GET /api/employees - Sucesso:', employees.length, 'funcionários')
    return NextResponse.json(employees)
  } catch (error) {
    console.error('❌ GET /api/employees - Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar funcionários' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  console.log('📥 POST /api/employees - Iniciando...')
  try {
    const employeeData = await request.json()
    console.log('📦 POST /api/employees - Dados recebidos:', employeeData)
    
    const id = await createEmployee(employeeData)
    console.log('✅ POST /api/employees - Funcionário criado com ID:', id)
    
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('❌ POST /api/employees - Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao criar funcionáraio' },
      { status: 500 }
    )
  }
}