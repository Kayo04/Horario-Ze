import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { podeVer } from '@/lib/permissoes'

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log('\n---  DEBUG: API Admin/Unavailable ---')
  
  try {
    const session = await getServerSession(authOptions)

    if (!session || !podeVer(session.user.role, session.user.permissions, 'adminpanel')) {
      console.log('❌ DEBUG: Falha de autenticação (Não é admin ou não há sessão)')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }
    
    console.log('✅ DEBUG: Admin autenticado')

    const { userId } = params

    if (!userId) {
      console.log('❌ DEBUG: ID do funcionário não recebido na URL')
      return NextResponse.json(
        { error: 'ID do funcionário em falta' },
        { status: 400 }
      )
    }
    
    console.log(`ℹ️ DEBUG: Recebido userId: ${userId}`)

    // Tentar converter para ObjectId
    let userObjectId
    try {
      userObjectId = new ObjectId(userId)
      console.log(`ℹ️ DEBUG: Convertido para ObjectId: ${userObjectId}`)
    } catch (e) {
      console.log(`❌ DEBUG: O userId "${userId}" NÃO é um ObjectId válido.`, e)
      return NextResponse.json({ error: 'ID de funcionário inválido' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('horaios')
    console.log('ℹ️ DEBUG: Ligado à DB "horaios"')

    const employeeData = await db.collection('employees').findOne({
      _id: userObjectId,
    })

    if (!employeeData) {
      console.log(`❌ DEBUG: Funcionário NÃO encontrado na coleção "employees" com o _id: ${userObjectId}`)
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ DEBUG: Funcionário ENCONTRADO!')
    
    // Logar o documento inteiro para vermos a estrutura
    console.log('--- ESTRUTURA DO DOCUMENTO ---')
    console.dir(employeeData, { depth: null })
    console.log('--------------------------------')

    const unavailableSlots = employeeData.unavailable?.specificDates || []
    
    console.log(`ℹ️ DEBUG: Slots extraídos (employeeData.unavailable?.specificDates): ${unavailableSlots.length}`)

    return NextResponse.json({ unavailable: unavailableSlots })
    
  } catch (error: any) {
    console.error('❌ DEBUG: ERRO CATASTRÓFICO NA API:', error)
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}