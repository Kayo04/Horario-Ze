import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

export async function POST(req: Request) {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');

    // Conexão robusta
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    const { id, source } = await req.json();

    if (!id || !source) {
        return NextResponse.json({ error: 'Dados em falta' }, { status: 400 });
    }

    // Atualiza a reserva com o marketingSource
    await Reservation.findByIdAndUpdate(id, { marketingSource: source });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao guardar source:", error);
    return NextResponse.json({ error: 'Erro ao guardar: ' + error.message }, { status: 500 });
  }
}