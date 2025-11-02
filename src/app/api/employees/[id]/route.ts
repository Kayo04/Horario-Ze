import { NextRequest, NextResponse } from 'next/server'
import { deleteEmployee } from '@/lib/employeeService'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🗑️ API DELETE chamada para ID:', params.id)
    
    if (!params.id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    const success = await deleteEmployee(params.id)
    
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
    console.error('❌ Erro na API DELETE:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}