import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

export async function GET(req: Request) {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error('A variável MONGODB_URI não está definida.');
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // ex: "2026-01-25"

    if (!dateParam) {
      return NextResponse.json({ error: 'Data obrigatória' }, { status: 400 });
    }

    // --- LOGS DE DEBUG ---
    console.log("🔍 Procurando reservas para o dia:", dateParam);

    // ESTRATÉGIA DE BUSCA DUPLA:
    // 1. Procura pelo campo 'date' exato (formato antigo)
    // 2. OU procura pelo campo 'datetime' que comece pela data (formato novo)
    const reservations = await Reservation.find({
      $or: [
        { date: dateParam }, // Encontra "2026-01-25"
        { datetime: { $regex: new RegExp(`^${dateParam}`) } } // Encontra "2026-01-25T..."
      ]
    }).sort({ startTime: 1, datetime: 1 }); // Ordena por hora

    console.log("✅ Encontradas:", reservations.length);

    // Ajustar os dados para o Frontend (normalizar)
    const normalizedData = reservations.map(res => ({
        ...res.toObject(),
        _id: res._id.toString(),
        // Garante que datetime existe para o frontend usar
        datetime: res.datetime || `${res.date}T${res.startTime}`,
        // Garante que adults existe
        adults: res.adults || res.people || 0,
        children: res.children || 0
    }));

    return NextResponse.json(normalizedData);

  } catch (error: any) {
    console.error("❌ ERRO:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}