// app/api/employees/unavailable/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔍 Sessão no GET:', session)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('horaios')
    
    console.log('📧 Buscando por email:', session.user.email)
    
    const employee = await db
      .collection('employees')
      .findOne(
        { email: session.user.email },
        { projection: { 'unavailable.specificDates': 1, name: 1 } }
      )
    
    console.log('👤 Funcionário encontrado:', employee ? 'Sim' : 'Não')
    
    if (!employee) {
      return NextResponse.json({ unavailable: [] })
    }

    const unavailableSlots = employee.unavailable?.specificDates || []
    console.log('📅 Slots encontrados:', unavailableSlots.length)
    
    return NextResponse.json({ 
      unavailable: unavailableSlots
    })
  } catch (error: any) {
    console.error('❌ Erro no GET /api/employees/unavailable:', error)
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔍 Sessão no PUT:', session)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📦 Body recebido:', body)
    
    // ✅ CORREÇÃO: Aceitar a estrutura correta da frontend
    const { specificDates } = body

    if (!specificDates || !Array.isArray(specificDates)) {
      return NextResponse.json({ 
        error: 'Dados inválidos: specificDates deve ser um array' 
      }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('horaios')
    
    console.log('💾 Tentando guardar para email:', session.user.email)
    console.log('📊 Dados a guardar:', specificDates)

    // ✅ CORREÇÃO COMPLETA: Verificar e criar estrutura se necessário
    const existingEmployee = await db
      .collection('employees')
      .findOne({ email: session.user.email })

    console.log('📋 Estado atual do employee:', existingEmployee?.unavailable)

    if (!existingEmployee) {
      return NextResponse.json({ 
        error: 'Funcionário não encontrado' 
      }, { status: 404 })
    }

    // ✅ CORREÇÃO: Se unavailable é null, criar estrutura completa
    let updateOperation: any
    
    if (existingEmployee.unavailable === null || !existingEmployee.unavailable) {
      console.log('🔄 Criando estrutura unavailable completa...')
      updateOperation = {
        $set: {
          'unavailable': {
            specificDates: specificDates,
            weekdays: []
          },
          updatedAt: new Date()
        }
      }
    } else {
      console.log('📝 Atualizando apenas specificDates...')
      updateOperation = {
        $set: {
          'unavailable.specificDates': specificDates,
          updatedAt: new Date()
        }
      }
    }

    const result = await db
      .collection('employees')
      .updateOne(
        { email: session.user.email },
        updateOperation
      )

    console.log('📊 Resultado MongoDB:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    })

    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        error: 'Funcionário não encontrado com email: ' + session.user.email 
      }, { status: 404 })
    }

    // Verificar se realmente guardou
    const updatedEmployee = await db
      .collection('employees')
      .findOne(
        { email: session.user.email },
        { projection: { 'unavailable.specificDates': 1 } }
      )

    console.log('✅ Dados após guardar:', updatedEmployee?.unavailable?.specificDates)

    return NextResponse.json({ 
      success: true, 
      message: 'Indisponibilidades guardadas com sucesso!',
      slotsCount: specificDates.length
    })
  } catch (error: any) {
    console.error('❌ Erro no PUT /api/employees/unavailable:', error)
    return NextResponse.json({ 
      error: 'Erro interno: ' + error.message 
    }, { status: 500 })
  }
}