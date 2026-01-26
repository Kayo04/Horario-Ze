import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Reservation from '@/models/Reservation';

// 🔥 ESTAS DUAS LINHAS OBRIGAM A ATUALIZAR SEMPRE (SEM CACHE)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI not defined');

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Buscar todas as reservas que tenham clientes
    const allReservations = await Reservation.find({ 
      "clients.0": { $exists: true } 
    }).sort({ createdAt: -1 });

    const allClients: any[] = [];

    allReservations.forEach((res: any) => {
      // Tenta apanhar a data de vários sítios para não dar "N/A"
      let finalDate = "Data N/A";
      if (res.date) finalDate = res.date;
      else if (res.datetime) finalDate = res.datetime.split('T')[0];

      if (res.clients && Array.isArray(res.clients)) {
        res.clients.forEach((client: any) => {
          allClients.push({
            _id: client._id || Math.random().toString(),
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            dob: client.dob,
            checkInTime: client.checkInTime,
            visitDate: finalDate, // Data corrigida
            eventType: res.eventType || "Geral"
          });
        });
      }
    });

    return NextResponse.json(allClients);

  } catch (error: any) {
    console.error("Erro API Clientes:", error);
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}