  import { NextRequest, NextResponse } from 'next/server'
  import { deleteReservation, updateReservation, getReservationById } from '@/lib/reservationService'
  import { getServerSession } from 'next-auth'
  import { authOptions } from '@/lib/auth'
  import { podeVer } from '@/lib/permissoes'

  // ⬇️ NOVO: Adicionada função GET (para um evento, se precisares no futuro)
  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const session = await getServerSession(authOptions)
      if (!session || !podeVer(session.user.role, session.user.permissions, 'scheduler')) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
      }

      const reservation = await getReservationById(params.id)
      if (!reservation) {
        return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
      }
      return NextResponse.json(reservation)
    } catch (error) {
      console.error('Erro ao buscar reserva:', error)
      return NextResponse.json({ error: 'Erro ao buscar reserva' }, { status: 500 })
    }
  }

  // ⬇️ NOVO: Adicionada função PUT
  export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const session = await getServerSession(authOptions)
      if (!session || !podeVer(session.user.role, session.user.permissions, 'scheduler')) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
      }
      
      // 1. Obter os dados que o frontend enviou
      const body = await request.json()
      
      // 2. Chamar a função de serviço (que vamos criar) para atualizar
      const success = await updateReservation(params.id, body)
      
      if (!success) {
        throw new Error('Falha ao atualizar na base de dados')
      }
      
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar reserva' },
        { status: 500 }
      )
    }
  }


  // A tua função DELETE (com verificação de segurança adicionada)
  export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const session = await getServerSession(authOptions)
      if (!session || !podeVer(session.user.role, session.user.permissions, 'scheduler')) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
      }

      const success = await deleteReservation(params.id)
      return NextResponse.json({ success })
    } catch (error) {
      console.error('Erro ao apagar reserva:', error)
      return NextResponse.json(
        { error: 'Erro ao apagar reserva' },
        { status: 500 }
      )
    }
  }