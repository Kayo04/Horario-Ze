import { NextRequest, NextResponse } from 'next/server'
import { deleteReservation } from '@/lib/reservationService'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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