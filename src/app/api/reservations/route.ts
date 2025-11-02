import { NextRequest, NextResponse } from 'next/server'
import { getReservations, createReservation, cleanupPastReservations } from '@/lib/reservationService'

// GET - Buscar todas as reservas (com limpeza automática)
export async function GET() {
  try {
    // Primeiro fazemos limpeza dos eventos passados
    await cleanupPastReservations()
    
    // Depois buscamos as reservas atuais
    const reservations = await getReservations()
    return NextResponse.json(reservations)
  } catch (error) {
    console.error('Erro ao buscar reservas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar reservas' },
      { status: 500 }
    )
  }
}

// POST - Criar nova reserva
export async function POST(request: NextRequest) {
  try {
    const reservationData = await request.json()
    const id = await createReservation(reservationData)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar reserva:', error)
    return NextResponse.json(
      { error: 'Erro ao criar reserva' },
      { status: 500 }
    )
  }
}