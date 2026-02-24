import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

export async function POST(req: Request) {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');

    // Garantir conexão
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    const body = await req.json();
    const { reservationId, firstName, lastName, email, phone, dob, city } = body;

    if (!reservationId) {
      return NextResponse.json({ error: 'ID da reserva em falta' }, { status: 400 });
    }

    console.log("📝 A tentar guardar cliente na reserva:", reservationId);

    // 1. Converter string para ObjectId para garantir que o Mongo entende
    const objectId = new mongoose.Types.ObjectId(reservationId);

    // 2. Tentar atualizar e retornar o documento NOVO ({ new: true })
    const updatedReservation = await Reservation.findByIdAndUpdate(
      objectId,
      {
        $push: {
          clients: {
            firstName,
            lastName,
            email,
            phone,
            dob,
            city,
            checkInTime: new Date()
          }
        }
      },
      { new: true, runValidators: false } // runValidators: false ajuda se houver conflitos de schema antigos
    );

    // 3. VERIFICAÇÃO CRÍTICA: Se updatedReservation for null, não encontrou nada!
    if (!updatedReservation) {
      console.error("❌ FALHA: Reserva não encontrada com o ID:", reservationId);
      return NextResponse.json({ error: 'Reserva não encontrada. O QR Code pode ser antigo.' }, { status: 404 });
    }

    console.log("✅ Sucesso! Cliente adicionado. Total clientes agora:", updatedReservation.clients?.length);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ ERRO CRÍTICO ao guardar cliente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}